import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, Heart, MessageSquare, Clock, DollarSign, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LiveAnalytics({ analytics, liveData, liveId, onExport }) {
  if (!analytics && !liveData) return null;

  const exportToCSV = () => {
    const data = analytics || liveData;
    const csvRows = [];
    
    // En-têtes
    csvRows.push(['Métrique', 'Valeur']);
    csvRows.push(['Spectateurs totaux', data.total_viewers || liveData?.viewers_count || 0]);
    csvRows.push(['Pic spectateurs', data.peak_viewers || liveData?.peak_viewers || 0]);
    csvRows.push(['Likes totaux', data.total_likes || liveData?.total_likes || 0]);
    csvRows.push(['Messages totaux', data.total_messages || liveData?.total_messages || 0]);
    csvRows.push(['Valeur des dons', data.total_gifts_value || liveData?.total_gifts_amount || 0]);
    csvRows.push(['Durée (secondes)', data.duration_seconds || (liveData?.duration_minutes ? liveData.duration_minutes * 60 : 0)]);
    csvRows.push(['Temps moyen visionnage', data.average_watch_time_seconds || 0]);
    
    // Pays
    if (data.viewer_countries) {
      csvRows.push([]);
      csvRows.push(['Pays', 'Nombre de spectateurs']);
      Object.entries(data.viewer_countries).forEach(([country, count]) => {
        csvRows.push([country, count]);
      });
    }
    
    // Rétention
    if (data.retention_buckets && data.retention_buckets.length > 0) {
      csvRows.push([]);
      csvRows.push(['Tranche de temps', 'Nombre de spectateurs', 'Pourcentage']);
      data.retention_buckets.forEach(bucket => {
        const percentage = data.total_viewers > 0 ? (bucket.count / data.total_viewers) * 100 : 0;
        csvRows.push([`${bucket.min}-${bucket.max}s`, bucket.count, `${percentage.toFixed(2)}%`]);
      });
    }
    
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-analytics-${liveId || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const exportToJSON = () => {
    const data = analytics || liveData;
    const jsonData = {
      live_id: liveId,
      exported_at: new Date().toISOString(),
      metrics: {
        total_viewers: data.total_viewers || liveData?.viewers_count || 0,
        peak_viewers: data.peak_viewers || liveData?.peak_viewers || 0,
        total_likes: data.total_likes || liveData?.total_likes || 0,
        total_messages: data.total_messages || liveData?.total_messages || 0,
        total_gifts_value: data.total_gifts_value || liveData?.total_gifts_amount || 0,
        duration_seconds: data.duration_seconds || (liveData?.duration_minutes ? liveData.duration_minutes * 60 : 0),
        average_watch_time_seconds: data.average_watch_time_seconds || 0,
      },
      viewer_countries: data.viewer_countries || {},
      retention_buckets: data.retention_buckets || [],
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-analytics-${liveId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export JSON téléchargé');
  };

  const data = analytics || {
    total_viewers: liveData?.viewers_count || 0,
    peak_viewers: liveData?.peak_viewers || 0,
    total_gifts_value: liveData?.total_gifts_amount || 0,
    total_messages: liveData?.total_messages || 0,
    total_likes: liveData?.total_likes || 0,
    duration_seconds: liveData?.duration_minutes ? liveData.duration_minutes * 60 : 0,
    average_watch_time_seconds: 0,
    viewer_countries: {},
    retention_buckets: []
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'XOF',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const metrics = [
    {
      label: 'Spectateurs',
      value: data.total_viewers || 0,
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      peak: data.peak_viewers || 0
    },
    {
      label: 'Likes',
      value: data.total_likes || 0,
      icon: Heart,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      label: 'Messages',
      value: data.total_messages || 0,
      icon: MessageSquare,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      label: 'Dons',
      value: formatCurrency(data.total_gifts_value || 0),
      icon: DollarSign,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20'
    },
    {
      label: 'Durée',
      value: formatDuration(data.duration_seconds || 0),
      icon: Clock,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      label: 'Temps moyen',
      value: formatDuration(data.average_watch_time_seconds || 0),
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg">Analytics en temps réel</h3>
        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button
            onClick={exportToJSON}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <FileText className="w-3 h-3 mr-1" />
            JSON
          </Button>
        </div>
      </div>
      
      {/* Métriques principales */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${metric.bgColor} rounded-lg p-3`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <span className="text-gray-400 text-xs">{metric.label}</span>
              </div>
              <p className={`${metric.color} font-bold text-lg`}>
                {typeof metric.value === 'string' ? metric.value : metric.value.toLocaleString()}
              </p>
              {metric.peak && (
                <p className="text-gray-500 text-xs mt-1">Pic: {metric.peak.toLocaleString()}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Graphique de rétention (simplifié) */}
      {data.retention_buckets && data.retention_buckets.length > 0 && (
        <div className="mt-4">
          <h4 className="text-white text-sm font-medium mb-2">Rétention des spectateurs</h4>
          <div className="space-y-2">
            {data.retention_buckets.slice(0, 5).map((bucket, idx) => {
              const percentage = data.total_viewers > 0 
                ? (bucket.count / data.total_viewers) * 100 
                : 0;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20">
                    {bucket.min}-{bucket.max}s
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                    />
                  </div>
                  <span className="text-gray-400 text-xs w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pays des spectateurs */}
      {data.viewer_countries && Object.keys(data.viewer_countries).length > 0 && (
        <div className="mt-4">
          <h4 className="text-white text-sm font-medium mb-2">Répartition géographique</h4>
          <div className="space-y-1">
            {Object.entries(data.viewer_countries)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([country, count], idx) => {
                const percentage = data.total_viewers > 0 
                  ? (count / data.total_viewers) * 100 
                  : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{country}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-blue-500 h-1.5 rounded-full"
                        />
                      </div>
                      <span className="text-gray-400 w-12 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
