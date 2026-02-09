import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsModal({ isOpen, onClose, stats }) {
  const statItems = [
    { 
      icon: Eye, 
      label: 'Vues totales', 
      value: stats?.total_views || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100' 
    },
    { 
      icon: Heart, 
      label: 'Likes totaux', 
      value: stats?.total_likes || 0,
      color: 'text-red-500',
      bgColor: 'bg-red-100'
    },
    { 
      icon: MessageCircle, 
      label: 'Commentaires', 
      value: stats?.total_comments || 0,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    { 
      icon: Share2, 
      label: 'Partages', 
      value: stats?.total_shares || 0,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100'
    },
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Statistiques</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-800 mb-1">
                  {formatNumber(item.value)}
                </p>
                <p className="text-sm text-gray-500">{item.label}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Engagement moyen</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            {stats?.engagement_rate || '0'}%
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}