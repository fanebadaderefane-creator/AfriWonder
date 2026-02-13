import React from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, Calendar, Radio, Video, GraduationCap, Briefcase,
  Building2, Wallet, Settings, Globe, WifiOff, Users, TrendingUp,
  Shield, HelpCircle, Info, ChevronRight, Sparkles, MapPin, Award, PiggyBank, FileText, Bell, QrCode, Share2, Download, MessageCircle,
  Ticket, Car, Utensils, Smartphone, HeartPulse, Home, ShieldCheck, Megaphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { MENU_ITEM_TO_FLAG } from '@/config/featureFlags';

/** Email autorisé pour le centre de contrôle — seul ce compte voit et accède au dashboard admin */
const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase();

const isSuperAdmin = (user) => user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

const menuSections = [
  {
    title: 'Super App AfriWonder',
    items: [
      { id: 'ticketing', label: 'Billets & Événements', icon: Ticket, page: 'Ticketing', color: 'bg-violet-100 text-violet-600', badge: 'Nouveau' },
      { id: 'transport', label: 'Transport & Courses', icon: Car, page: 'Transport', color: 'bg-amber-100 text-amber-600', badge: 'Nouveau' },
      { id: 'food', label: 'Restaurants & Livraison', icon: Utensils, page: 'FoodDelivery', color: 'bg-orange-100 text-orange-600', badge: 'Nouveau' },
      { id: 'wallet-super', label: 'Wallet & Paiements', icon: Wallet, page: 'Wallet', color: 'bg-green-100 text-green-600' },
      { id: 'utilities', label: 'Airtime & Factures', icon: Smartphone, page: 'Utilities', color: 'bg-blue-100 text-blue-600', badge: 'Nouveau' },
      { id: 'health', label: 'Santé & Télémedecine', icon: HeartPulse, page: 'Telemedicine', color: 'bg-red-100 text-red-600', badge: 'Nouveau' },
      { id: 'property', label: 'Immobilier', icon: Home, page: 'RealEstate', color: 'bg-teal-100 text-teal-600', badge: 'Nouveau' },
      { id: 'insurance', label: 'Assurances', icon: ShieldCheck, page: 'Insurance', color: 'bg-indigo-100 text-indigo-600', badge: 'Nouveau' },
    ]
  },
  {
    title: 'Commerce & Services',
    items: [
      { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, page: 'Marketplace', color: 'bg-orange-100 text-orange-600', badge: 'Nouveau' },
      { id: 'services', label: 'Services locaux', icon: MapPin, page: 'Services', color: 'bg-blue-100 text-blue-600' },
      { id: 'orders', label: 'Mes commandes', icon: FileText, page: 'Orders', color: 'bg-green-100 text-green-600' },
    ]
  },
  {
    title: 'Événements & Actualités',
    items: [
      { id: 'events', label: 'Événements', icon: Calendar, page: 'Events', color: 'bg-purple-100 text-purple-600' },
      { id: 'news', label: 'Actualités', icon: Bell, page: 'News', color: 'bg-red-100 text-red-600' },
    ]
  },
  {
    title: 'Créateurs & Live',
    items: [
      { id: 'live', label: 'Regarder les lives', icon: Radio, page: 'Lives', color: 'bg-pink-100 text-pink-600', badge: 'Live' },
      { id: 'live-stream', label: 'Démarrer un live', icon: Video, page: 'LiveStream', color: 'bg-red-100 text-red-600' },
      { id: 'creator-tools', label: 'Outils créateurs', icon: Sparkles, page: 'CreatorTools', color: 'bg-amber-100 text-amber-600' },
      { id: 'advertiser-dashboard', label: 'Mes campagnes pub', icon: Megaphone, page: 'AdvertiserDashboard', color: 'bg-orange-100 text-orange-600', badge: 'Pub' },
      { id: 'analytics', label: 'Statistiques', icon: TrendingUp, page: 'Analytics', color: 'bg-indigo-100 text-indigo-600' },
    ]
  },
  {
    title: 'Éducation & Formation',
    items: [
      { id: 'courses', label: 'Formations', icon: GraduationCap, page: 'Courses', color: 'bg-emerald-100 text-emerald-600' },
      { id: 'instructor-dashboard', label: 'Dashboard instructeur', icon: TrendingUp, page: 'InstructorDashboard', color: 'bg-amber-100 text-amber-600' },
      { id: 'certificates', label: 'Mes certificats', icon: Award, page: 'Certificates', color: 'bg-yellow-100 text-yellow-600' },
      { id: 'badges', label: 'Mes Badges', icon: Award, page: 'BadgesProfile', color: 'bg-yellow-100 text-yellow-600' },
      { id: 'leaderboard', label: 'Classement', icon: TrendingUp, page: 'Leaderboard', color: 'bg-indigo-100 text-indigo-600' },
    ]
  },
  {
    title: 'Finance',
    items: [
      { id: 'wallet', label: 'Mon Wallet', icon: Wallet, page: 'Wallet', color: 'bg-green-100 text-green-600' },
      { id: 'microcredit', label: 'Microcrédit', icon: PiggyBank, page: 'Microcredit', color: 'bg-cyan-100 text-cyan-600', badge: 'Bientôt' },
      { id: 'crowdfunding', label: 'Crowdfunding', icon: Users, page: 'Crowdfunding', color: 'bg-violet-100 text-violet-600' },
    ]
  },
  {
    title: 'Emploi & Services Civiques',
    items: [
      { id: 'jobs', label: 'Offres d\'emploi', icon: Briefcase, page: 'Jobs', color: 'bg-blue-100 text-blue-600' },
      { id: 'civic', label: 'Services publics', icon: Building2, page: 'Civic', color: 'bg-gray-100 text-gray-600' },
    ]
  },
  {
    title: 'Outils Africains',
    items: [
      { id: 'offline', label: 'Mode hors-ligne', icon: WifiOff, page: 'Offline', color: 'bg-orange-100 text-orange-600' },
      { id: 'qrcode', label: 'Mon QR Code', icon: QrCode, page: 'QRCode', color: 'bg-gray-100 text-gray-800' },
      { id: 'share-offline', label: 'Partage Bluetooth', icon: Share2, page: 'ShareOffline', color: 'bg-indigo-100 text-indigo-600' },
      { id: 'downloads', label: 'Téléchargements', icon: Download, page: 'Downloads', color: 'bg-purple-100 text-purple-600' },
    ]
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'settings', label: 'Paramètres', icon: Settings, page: 'Settings', color: 'bg-gray-100 text-gray-600' },
      { id: 'notifications', label: 'Notifications', icon: Bell, page: 'NotificationSettings', color: 'bg-orange-100 text-orange-600' },
      { id: 'language', label: 'Langue', icon: Globe, page: 'Language', color: 'bg-cyan-100 text-cyan-600' },
      { id: 'help', label: 'Aide & Support', icon: HelpCircle, page: 'Help', color: 'bg-yellow-100 text-yellow-600' },
      { id: 'support', label: 'Mes tickets support', icon: MessageCircle, page: 'Support', color: 'bg-blue-100 text-blue-600' },
      { id: 'about', label: 'À propos', icon: Info, page: 'About', color: 'bg-gray-100 text-gray-500' },
    ]
  },
  {
    title: 'Légal & Sécurité',
    items: [
      { id: 'privacy', label: 'Politique de confidentialité', icon: FileText, page: 'PrivacyPolicy', color: 'bg-blue-100 text-blue-600' },
      { id: 'data-protection', label: 'Protection des données', icon: Shield, page: 'DataProtection', color: 'bg-purple-100 text-purple-600' },
    ]
  }
];

export default function MenuPlus({ isOpen, onClose, user }) {
  const { isEnabled } = useFeatureFlags();

  const isItemVisible = (itemId) => {
    const flag = MENU_ITEM_TO_FLAG[itemId];
    if (!flag) return true;
    return isEnabled(flag);
  };

  const filteredSections = menuSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => isItemVisible(item.id)),
  })).filter((section) => section.items.length > 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[85%] max-w-md p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header with user info */}
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-4 border-white/30">
                <AvatarImage src={user?.profile_image} />
                <AvatarFallback className="bg-white/20 text-white text-xl">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <h3 className="font-bold text-lg">{user?.full_name || 'Utilisateur'}</h3>
                <p className="text-white/70 text-sm">@{user?.email?.split('@')[0]}</p>
              </div>
            </div>
            
            {/* Quick stats */}
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">0</p>
                <p className="text-white/60 text-xs">Abonnés</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">0</p>
                <p className="text-white/60 text-xs">Abonnements</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">0</p>
                <p className="text-white/60 text-xs">J'aime</p>
              </div>
            </div>
          </div>

          {/* Menu content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {isSuperAdmin(user) && (
              <div className="py-3 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
                <h4 className="px-4 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
                  Administrateur
                </h4>
                <div className="bg-white mx-4 rounded-xl border-2 border-orange-200 shadow-md overflow-hidden">
                  <Link
                    to={createPageUrl('AdminDashboard')}
                    onClick={onClose}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-orange-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-gray-800 block">Centre de contrôle</span>
                      <span className="text-xs text-gray-500">Contrôle total AfriWonder</span>
                    </div>
                    <Badge className="bg-orange-500 text-white">Admin</Badge>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>
              </div>
            )}
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.title} className="py-3">
                <h4 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h4>
                <div className="bg-white">
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (sectionIndex * 0.05) + (itemIndex * 0.02) }}
                      >
                        <Link
                          to={createPageUrl(item.page)}
                          onClick={onClose}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="flex-1 font-medium text-gray-700">{item.label}</span>
                          {item.badge && (
                            <Badge className={`text-xs ${
                              item.badge === 'Live' ? 'bg-red-500' : 
                              item.badge === 'Nouveau' ? 'bg-orange-500' : 
                              'bg-gray-400'
                            }`}>
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="p-4 text-center">
              <p className="text-gray-400 text-xs">
                AfriVibe v1.0 • Fabriqué en Afrique 🌍
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}