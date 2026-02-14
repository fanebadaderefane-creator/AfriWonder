import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, BarChart3, Users, Package, Video, ShoppingBag, Flag, AlertCircle, Settings,
  Shield, Activity, Search, DollarSign, TrendingUp, FileText, Truck, RotateCcw, Megaphone, UserCheck,
  Zap,
} from 'lucide-react';
import PlatformHealth from './PlatformHealth';

const TABS = [
  { id: 'overview', label: 'Aperçu', icon: BarChart3 },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'videos', label: 'Vidéos', icon: Video },
  { id: 'orders', label: 'Commandes', icon: Package },
  { id: 'sellers', label: 'Vendeurs', icon: ShoppingBag },
  { id: 'verifications', label: 'KYC', icon: UserCheck },
  { id: 'campagnes', label: 'Campagnes pub', icon: Megaphone },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'reports', label: 'Signalements', icon: Flag },
  { id: 'disputes', label: 'Litiges', icon: AlertCircle },
  { id: 'returns', label: 'Retours', icon: RotateCcw },
  { id: 'logistics', label: 'Logistique', icon: Truck },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'audit', label: 'Journal audit', icon: FileText },
  { id: 'earlyaccess', label: 'Early Access', icon: Zap },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const ROLE_ACCESS = {
  super_admin: new Set(TABS.map((t) => t.id)),
  admin: new Set(['overview', 'users', 'videos', 'orders', 'sellers', 'verifications', 'campagnes', 'reports', 'disputes', 'returns', 'finance', 'logistics', 'analytics', 'audit', 'earlyaccess', 'settings']),
  finance_admin: new Set(['overview', 'finance', 'orders', 'audit', 'logistics', 'campagnes', 'verifications', 'earlyaccess']),
  moderation_admin: new Set(['overview', 'users', 'videos', 'orders', 'sellers', 'campagnes', 'reports', 'disputes', 'returns', 'logistics', 'verifications']),
  support_admin: new Set(['overview', 'users', 'disputes', 'returns', 'reports', 'logistics']),
  data_admin: new Set(['overview', 'analytics', 'audit', 'orders', 'users', 'logistics']),
};

function canAccess(role, tabId) {
  const set = ROLE_ACCESS[role] || ROLE_ACCESS.admin;
  return set.has(tabId);
}

export default function AdminLayout({ user, activeTab, onTabChange, searchQuery, onSearchChange, children }) {
  const navigate = useNavigate();
  const role = user?.role || 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 border-b border-white/20 shadow-2xl z-40">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/Home')}
              className="w-10 h-10 shrink-0 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
                <Shield className="w-6 h-6 shrink-0" />
                <span className="truncate">Centre de Contrôle AfriWonder</span>
              </h1>
              <p className="text-white/80 text-xs">
                {role} • Contrôle Total
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 shrink-0">
            <Activity className="w-3 h-3 mr-1" />
            En ligne
          </Badge>
        </div>
        <div className="px-4 pb-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <Input
              placeholder="Rechercher utilisateurs, commandes, produits..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <PlatformHealth />

        <div className="flex gap-2 mb-6 overflow-x-auto overflow-y-hidden bg-white/10 backdrop-blur rounded-xl p-2">
          <div className="flex gap-2 min-w-max">
            {TABS.filter((tab) => canAccess(role, tab.id)).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2.5 font-medium text-sm transition-all rounded-lg flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-white text-purple-600 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
