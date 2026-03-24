import React from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Ticket, Car, UtensilsCrossed, Zap, Heart, Building2,
  Shield, Wrench, Newspaper, GraduationCap, CreditCard, Target,
  Briefcase, Wallet, User, Settings, ChevronRight,
  Crown, ShoppingCart, Radio, Trophy, Grid3x3, X, FileText, Lock,
  BarChart3, Video, Sparkles, Share2, HelpCircle, MessageCircle, Info,
  Megaphone, Globe, Bell, Compass, PlusSquare
} from "lucide-react";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils.js";
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { preloadPageByName, preloadPages } from '@/pages.config.glob';

// Sections du menu (structure Super App AfriWonder)
const MENU_SECTIONS = [
  {
    title: "Wallet & Paiements",
    items: [
      { icon: Wallet, label: "Mon Wallet", color: "text-green-600", page: 'Wallet' },
    ],
  },
  {
    title: "COMMERCE & SERVICES",
    items: [
      { icon: ShoppingCart, label: "Marketplace", color: "text-blue-600", badge: "Nouveau", page: 'Marketplace' },
      { icon: Ticket, label: "Événements", color: "text-purple-600", page: 'Events' },
      { icon: Car, label: "Transport", color: "text-blue-600", page: 'Transport' },
      { icon: UtensilsCrossed, label: "Restauration", color: "text-blue-600", page: 'FoodDelivery' },
      { icon: Zap, label: "Services", color: "text-yellow-600", page: 'Utilities' },
      { icon: Heart, label: "Santé", color: "text-red-600", page: 'Telemedicine' },
      { icon: Building2, label: "Immobilier", color: "text-teal-600", page: 'RealEstate' },
      { icon: Shield, label: "Assurances", color: "text-indigo-600", page: 'Insurance' },
      { icon: Wrench, label: "Prestataires", color: "text-blue-600", page: 'Marketplace' },
      { icon: Newspaper, label: "Actualités", color: "text-gray-600", page: 'News' },
      { icon: CreditCard, label: "Microcrédit", color: "text-emerald-600", page: 'Microcredit' },
      { icon: Target, label: "Crowdfunding", color: "text-pink-600", page: 'Crowdfunding' },
      { icon: Briefcase, label: "Emplois", color: "text-blue-600", page: 'Jobs' },
      { icon: Grid3x3, label: "Mini-Apps", color: "text-blue-600", badge: "Nouveau", page: 'MiniAppsStore' },
    ],
  },
  {
    title: "SOCIAL & MESSAGERIE",
    items: [
      { icon: MessageCircle, label: "Messages", color: "text-blue-600", page: 'Inbox' },
      { icon: BarChart3, label: "Publications & Sondages", color: "text-indigo-600", page: 'FeedPosts' },
    ],
  },
  {
    title: "CRÉATEURS & LIVE",
    items: [
      { icon: Compass, label: "Découvrir", color: "text-primary", page: 'Discover' },
      { icon: PlusSquare, label: "Créer", color: "text-primary", page: 'Create' },
      { icon: Radio, label: "Regarder les lives", color: "text-pink-600", badge: "Live", page: 'Live' },
      { icon: Video, label: "Démarrer un live", color: "text-pink-600", page: 'LiveStream' },
      { icon: Sparkles, label: "Outils créateurs", color: "text-yellow-600", page: 'CreatorTools' },
      { icon: Share2, label: "Parrainage", color: "text-blue-600", page: 'Referrals' },
      { icon: Megaphone, label: "Mes campagnes pub", color: "text-blue-600", badge: "Pub", page: 'AdvertiserDashboard' },
    ],
  },
  {
    title: "ÉDUCATION & FORMATION",
    items: [
      { icon: GraduationCap, label: "Formations", color: "text-green-600", page: 'Courses' },
      { icon: Trophy, label: "Mes Badges", color: "text-yellow-600", page: 'BadgesProfile' },
      { icon: BarChart3, label: "Classement", color: "text-purple-600", page: 'Leaderboard' },
      { icon: Trophy, label: "Gamification", color: "text-blue-600", page: 'GamificationHub' },
    ],
  },
  {
    title: "PARCOURS INTELLIGENT",
    items: [
      { icon: Sparkles, label: "Parcours Intelligent", color: "text-blue-600", badge: "IA", page: 'MatchingCenter' },
    ],
  },
  {
    title: "PARAMÈTRES",
    items: [
      { icon: User, label: "Profil", color: "text-gray-600", page: 'Profile' },
      { icon: Settings, label: "Paramètres", color: "text-gray-600", page: 'Settings' },
      { icon: BarChart3, label: "Statistiques", color: "text-purple-600", page: 'Analytics' },
      { icon: Bell, label: "Notifications", color: "text-blue-600", page: 'Notifications' },
      { icon: Globe, label: "Langue", color: "text-blue-600", page: 'Language' },
      { icon: HelpCircle, label: "Aide & Support", color: "text-gray-600", page: 'Help' },
      { icon: MessageCircle, label: "Mes tickets support", color: "text-gray-600", page: 'Support' },
      { icon: Info, label: "À propos", color: "text-gray-600", page: 'About' },
      { icon: Crown, label: "Admin", color: "text-yellow-600", admin: true, page: 'AdminDashboard' },
    ],
  },
  {
    title: "LÉGAL & SÉCURITÉ",
    items: [
      { icon: FileText, label: "Politique de confidentialité", color: "text-gray-600", page: 'PrivacyPolicy' },
      { icon: Lock, label: "Protection des données", color: "text-gray-600", page: 'DataProtection' },
    ],
  },
];

/** Email autorisé pour le centre de contrôle — seul ce compte voit et accède au dashboard admin */
const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase();

const isSuperAdmin = (user) => user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

const MENU_PAGE_NAMES = Array.from(
  new Set(MENU_SECTIONS.flatMap((section) => section.items.map((item) => item.page)).filter(Boolean))
);

export default function MenuPlus({ isOpen, onClose, onNavigateFromMenu, user }) {
  const location = useLocation();
  const pathname = location.pathname;

  React.useEffect(() => {
    if (!isOpen) return;
    preloadPages(MENU_PAGE_NAMES).catch(() => {});
  }, [isOpen]);

  // Charger les statistiques utilisateur
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, following: 0 };
      try {
        const stats = await api.users.getStats(user.id);
        return {
          followers: stats?.stats?.followers || stats?.followers_count || stats?.followers || 0,
          following: stats?.stats?.following || stats?.following_count || stats?.following || 0,
        };
      } catch {
        // Fallback: utiliser les endpoints de followers/following
        try {
          const [followersRes, followingRes] = await Promise.all([
            api.users.getFollowers(user?.id).catch(() => ({ followers: [] })),
            api.users.getFollowing(user?.id).catch(() => ({ following: [] }))
          ]);
          return {
            followers: Array.isArray(followersRes?.followers) ? followersRes.followers.length : 
                      Array.isArray(followersRes) ? followersRes.length : 0,
            following: Array.isArray(followingRes?.following) ? followingRes.following.length : 
                      Array.isArray(followingRes) ? followingRes.length : 0
          };
        } catch {
          return { followers: 0, following: 0 };
        }
      }
    },
    enabled: !!user?.id && isOpen,
  });

  // Charger le total de likes
  const { data: likedVideos } = useQuery({
    queryKey: ['user-liked-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const result = await api.users.getLikedVideos(user.id, { limit: 0 });
        return Array.isArray(result) ? result : (result?.videos || []);
      } catch {
        return [];
      }
    },
    enabled: !!user?.id && isOpen,
  });

  const totalLikes = likedVideos?.length || 0;
  const followers = userStats?.followers || 0;
  const following = userStats?.following || 0;

  const isActiveFor = (page) => {
    const url = createPageUrl(page);
    return pathname === url || (url !== '/' && pathname.startsWith(url));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[85%] max-w-md p-0 overflow-hidden flex flex-col">
        {/* En-tête fixe (profil + X) — ne défile pas */}
        <div className="flex flex-col flex-shrink-0 bg-white">
          {/* Section Profil Utilisateur avec fond dégradé */}
          {user && (
            <div className="relative bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 px-4 pt-12 pb-6">
              {/* Bouton fermer en haut à droite — reste en place au scroll */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
              >
                <X className="w-5 h-5 text-blue-600" />
              </button>
              
              {/* Contenu profil */}
              <div className="flex items-start gap-3 mb-6">
                {/* Photo de profil */}
                <Avatar className="w-16 h-16 border-2 border-white shadow-lg">
                  <AvatarImage 
                    src={user.profile_image} 
                    alt={user.full_name || user.username}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="bg-white text-blue-600 font-bold text-lg">
                    {(user.full_name || user.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Nom et handle */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-extrabold text-xl uppercase truncate">
                    {user.full_name || user.username || 'Utilisateur'}
                  </h2>
                  <p className="text-white/90 text-sm truncate">
                    @{user.username || user.email?.split('@')[0] || 'user'}
                  </p>
                </div>
              </div>
              
              {/* Statistiques */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-white text-2xl font-bold">{followers}</span>
                  <span className="text-white/90 text-xs">Wonderers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white text-2xl font-bold">{following}</span>
                  <span className="text-white/90 text-xs">Dans leur Wonder</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white text-2xl font-bold">{totalLikes}</span>
                  <span className="text-white/90 text-xs">J'aime</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste du menu — seule zone qui défile */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col py-4 pb-6">
            {/* Menu par sections — toutes les entrées avec navigation complète */}
            {MENU_SECTIONS.map((section) => (
              <div key={section.title} className="mb-4">
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {section.title}
                </h3>
                <nav className="px-3 space-y-0.5">
                  {section.items
                    .filter((item) => !item.admin || isSuperAdmin(user))
                    .map((item) => {
                      const isActive = isActiveFor(item.page);
                      const url = createPageUrl(item.page);
                      return (
                        <Link
                          key={`${section.title}-${item.label}`}
                          to={url}
                          onMouseEnter={() => preloadPageByName(item.page)}
                          onTouchStart={() => preloadPageByName(item.page)}
                          onClick={() => {
                            onNavigateFromMenu?.(pathname);
                            onClose();
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                            isActive
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700"
                              : item.admin
                                ? "text-yellow-700 hover:bg-yellow-50"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600" : item.color)} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {item.admin && (
                            <span className="px-1.5 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">
                              Admin
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </Link>
                      );
                    })}
                </nav>
              </div>
            ))}

            {/* Version - AfriWonder */}
            <div className="px-6 py-3 mt-auto">
              <p className="text-xs text-gray-400">AfriWonder v1.0.0</p>
              <p className="text-xs text-gray-400">🇲🇱 Made in Mali</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
