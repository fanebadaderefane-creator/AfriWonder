import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Search, Star, Grid3x3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import BottomNav from '@/components/navigation/BottomNav';
import { MOCK_MINI_APPS, MOCK_CATEGORIES, MOCK_INSTALLED_APPS } from '@/data/miniAppsMock';
import { cn } from '@/lib/utils';

export default function MiniAppsStore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const [installedApps, setInstalledApps] = useState(new Set(MOCK_INSTALLED_APPS));

  useEffect(() => {
    const getUser = async () => {
      try {
        const { api } = await import('@/api/expressClient');
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const filteredApps = MOCK_MINI_APPS.filter(app => {
    const matchSearch = !searchQuery || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const featuredApps = MOCK_MINI_APPS.filter(app => app.featured);
  const trendingApps = [...MOCK_MINI_APPS].sort((a, b) => b.installs - a.installs).slice(0, 5);

  const handleInstall = (appId) => {
    setInstalledApps(prev => new Set([...prev, appId]));
  };

  const handleUninstall = (appId) => {
    setInstalledApps(prev => {
      const newSet = new Set(prev);
      newSet.delete(appId);
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mini-Apps Store</h1>
            <p className="text-xs text-gray-500">Plateforme ouverte de services</p>
          </div>
          {user && (
            <Link to={createPageUrl('DeveloperConsole')}>
              <Button size="sm" variant="outline" className="text-xs">
                Développeur
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher une mini-app..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Catégories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {MOCK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id
                  ? "bg-[#f97316] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Apps en vedette */}
        {selectedCategory === 'all' && featuredApps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-[#f97316]" />
              <h2 className="font-bold text-lg">En vedette</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {featuredApps.map(app => (
                <Link
                  key={app.id}
                  to={`${createPageUrl('MiniAppDetails')}?id=${app.id}`}
                  className="flex-shrink-0 w-48"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-32 bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center overflow-hidden">
                      {app.icon.startsWith('http') ? (
                        <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl">{app.icon}</span>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1">{app.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 fill-[#f97316] text-[#f97316]" />
                        <span className="text-xs text-gray-600">{app.rating}</span>
                        <span className="text-xs text-gray-400">({app.reviews_count})</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{app.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tendances */}
        {selectedCategory === 'all' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#f97316]" />
              <h2 className="font-bold text-lg">Tendances</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trendingApps.slice(0, 4).map(app => (
                <Link
                  key={app.id}
                  to={`${createPageUrl('MiniAppDetails')}?id=${app.id}`}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                      {app.icon.startsWith('http') ? (
                        <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{app.icon}</span>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1">{app.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#f97316] text-[#f97316]" />
                          <span className="text-xs text-gray-600">{app.rating}</span>
                        </div>
                        <span className="text-xs text-gray-400">{app.installs.toLocaleString()}+</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Liste complète */}
        <div>
          <h2 className="font-bold text-lg mb-3">
            {selectedCategory === 'all' ? 'Toutes les Mini-Apps' : MOCK_CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </h2>
          <div className="space-y-3">
            {filteredApps.map((app, index) => {
              const isInstalled = installedApps.has(app.id);
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`${createPageUrl('MiniAppDetails')}?id=${app.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {app.icon.startsWith('http') ? (
                              <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl">{app.icon}</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base mb-1">{app.name}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {app.developer.verified && (
                                    <Badge className="text-xs bg-[#f97316] text-white border-0">✓ Vérifié</Badge>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-[#f97316] text-[#f97316]" />
                                    <span className="text-xs text-gray-600">{app.rating}</span>
                                    <span className="text-xs text-gray-400">({app.reviews_count})</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{app.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{app.installs.toLocaleString()} installations</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{app.developer.name}</span>
                              </div>
                              {isInstalled && (
                                <Badge variant="outline" className="text-xs text-[#f97316] border-[#f97316]">
                                  Installé
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-12">
            <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune mini-app trouvée</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
