import React, { useState } from 'react';

import { api } from '@/api/expressClient';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';

import { Button } from "@/components/ui/button";


import { Search, Bell, MessageCircle, WifiOff, RefreshCw, Menu } from 'lucide-react';

import { motion } from 'framer-motion';

import { cn } from "@/lib/utils";

import { Link } from 'react-router-dom';

import { createPageUrl } from "@/utils";
import { preloadPageByName } from '@/pages.config.glob';

import { useTranslation } from "@/components/common/useTranslation";

import NotificationCenter from "@/components/notifications/NotificationCenter";
import { usePageVisibility } from '@/hooks/usePageVisibility';



export default function TopHeader({ 

  activeTab = 'pourtoi', 

  onTabChange, 

  showTabs = true,

  title,

  isLowData = false,

  isDarkMode = false,

  onToggleDarkMode,

  unreadNotifications = 0,

  followingCount = 0,

  onRefresh,

  showMenuButton = false,

  onMenuOpen,

  fixed = true,

  feedMode = false,

}) {

  const { user: authUser } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);

  const { t } = useTranslation();
  const isPageVisible = usePageVisibility();

  // Badges : une seule source user (AuthContext), pas de 2e GET /auth/me.
  // refetchOnMount: false évite une rafale au remontage du header (ex. chargement Home / changement d’onglet).
  const headerPollMs = 60000;

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', authUser?.id],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      const data = result?.data || result;
      return data?.notifications || result?.notifications || [];
    },
    enabled: !!authUser?.id,
    staleTime: headerPollMs,
    refetchInterval: isPageVisible ? headerPollMs : false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: messagesUnread } = useQuery({
    queryKey: ['messages-unread-count', authUser?.id],
    queryFn: () => api.messages.getUnreadCount(),
    enabled: !!authUser?.id,
    staleTime: headerPollMs,
    refetchInterval: isPageVisible ? headerPollMs : false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const messagesCount = messagesUnread?.count ?? 0;
  const warmPage = (page) => {
    preloadPageByName(page).catch(() => {});
  };

  const feedIconButtonClass =
    'h-9 w-9 rounded-full border-0 bg-white/10 text-white shadow-none backdrop-blur-md hover:bg-white/16 active:scale-[0.96]';



  return (

    <header
      className={cn(
        'z-50 bg-gradient-to-b from-black/72 via-black/22 to-transparent pointer-events-none safe-area-pt',
        fixed ? 'fixed top-0 left-0 right-0' : 'relative'
      )}
    >

      <div className="pointer-events-auto">

        <div
          className={cn(
            feedMode
              ? // Colonne droite = largeur réelle des icônes (max-content). Centre = tout l’espace restant (minmax 0,1fr)
              // pour que le texte ne passe JAMAIS sous les boutons (bug 1fr|auto|1fr : les icônes débordaient).
              'grid min-h-[56px] grid-cols-[minmax(0,2.75rem)_minmax(0,1fr)_max-content] items-center gap-x-2.5 gap-y-0 px-3 py-2.5 sm:min-h-[60px] sm:grid-cols-[minmax(0,3rem)_minmax(0,1fr)_max-content] sm:gap-x-3 sm:px-3.5 sm:py-3'
              : 'flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3'
          )}
        >

          {/* Left side */}

          <div className={cn('flex min-w-0 items-center justify-start gap-2', feedMode ? '' : 'flex-1')}>

            {isLowData && (

              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full text-xs">

                <WifiOff className="w-3 h-3" />

                <span className="font-medium">Lite</span>

              </div>

            )}

          </div>



          {/* Center - Tabs or Title */}

           {showTabs ? (

            <div
              className={cn(
                'flex min-w-0 items-center',
                feedMode
                  ? // pr-* : marge avant la colonne icônes (évite que le texte passe sous les boutons / z-index)
                      'pointer-events-auto min-w-0 justify-center justify-self-stretch overflow-hidden pl-0.5 pr-3 sm:pr-4'
                  : 'flex-1 justify-center gap-4 sm:gap-8'
              )}
            >
              <div
                className={cn(
                  'flex min-w-0 items-center',
                  feedMode
                    ? 'w-full max-w-full justify-center gap-2 sm:gap-3.5'
                    : 'gap-4 sm:gap-8'
                )}
              >

              {/* forYou à gauche */}
              <button
                type="button"
                onClick={() => onTabChange('pourtoi')}

                className={cn(
                  feedMode
                    ? cn(
                        'relative shrink-0 whitespace-nowrap px-0.5 py-1 text-[12px] font-semibold tracking-[-0.02em] text-white transition-colors duration-200 sm:text-[14px]',
                        activeTab === 'pourtoi' ? 'opacity-100' : 'opacity-[0.62]'
                      )
                    : cn(
                        'relative text-sm font-semibold transition-all sm:text-base',
                        activeTab === 'pourtoi' ? 'text-white' : 'text-white/50'
                      )
                )}
              >

                {t('forYou')}

                {activeTab === 'pourtoi' && (

                  <motion.div

                    layoutId="feed-tab-underline"

                    className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]"

                  />

                )}

              </button>

              {/* Mon Wonder à droite de forYou */}
              <button
                type="button"
                onClick={() => onTabChange('abonnements')}

                className={cn(
                  feedMode
                    ? cn(
                        // min-w-0 + truncate : ne jamais empiéter sous la colonne icônes (message / notif / menu)
                        'relative flex min-w-0 max-w-[min(100%,6.25rem)] items-center gap-1 whitespace-nowrap px-0.5 py-1 text-[12px] font-semibold tracking-[-0.02em] text-white transition-colors duration-200 sm:max-w-[10rem] sm:gap-1.5 sm:text-[14px]',
                        activeTab === 'abonnements' ? 'opacity-100' : 'opacity-[0.62]'
                      )
                    : cn(
                        'flex items-center gap-1.5 text-sm font-semibold transition-all sm:text-base',
                        activeTab === 'abonnements' ? 'text-white' : 'text-white/50'
                      )
                )}
              >

                <span className="min-w-0 flex-1 truncate text-left text-inherit" title={t('my_wonder')}>
                  {t('my_wonder')}
                </span>

                {followingCount > 0 && activeTab === 'abonnements' && (

                  <span className="shrink-0 tabular-nums text-[10px] font-semibold text-white/70">

                    {followingCount}

                  </span>

                )}

                {activeTab === 'abonnements' && (

                  <motion.div

                    layoutId="feed-tab-underline"

                    className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]"

                  />

                )}

              </button>

              </div>
            </div>

          ) : (

           <h1 className="text-white text-base sm:text-lg font-bold">{title}</h1>

          )}



          {/* Right side */}

          <div
            className={cn(
              'flex items-center justify-end',
              feedMode ? 'relative z-[2] min-w-0 flex-shrink-0 justify-self-end gap-1.5 pl-0.5 sm:gap-2' : 'flex-1 gap-1'
            )}
          >

            {typeof onRefresh === 'function' && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-white hover:bg-white/10 h-9 w-9', feedMode && feedIconButtonClass)}
                onClick={onRefresh}
                aria-label="Rafraîchir"
              >
                <RefreshCw className="h-5 w-5 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]" strokeWidth={2.35} />
              </Button>
            )}

            <Link
              to={createPageUrl('Search')}
              onMouseEnter={() => warmPage('Search')}
              onFocus={() => warmPage('Search')}
              onTouchStart={() => warmPage('Search')}
              className={cn(feedMode ? 'hidden' : 'block')}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'text-white hover:bg-white/10',
                  feedMode ? feedIconButtonClass : 'h-9 w-9'
                )}
              >
                <Search className="h-5 w-5 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]" strokeWidth={2.35} />
              </Button>
            </Link>

            <Link
              to={createPageUrl('Inbox')}
              onMouseEnter={() => warmPage('Inbox')}
              onFocus={() => warmPage('Inbox')}
              onTouchStart={() => warmPage('Inbox')}
              className="block text-white visited:text-white"
              style={{ color: '#ffffff' }}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative text-white hover:bg-white/10',
                  feedMode
                    ? feedIconButtonClass
                    : 'h-9 w-9'
                )}
              >
                <MessageCircle className={cn(feedMode ? 'h-4 w-4 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]' : 'w-5 h-5 text-white')} strokeWidth={2.35} />
                {messagesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#0b111d] bg-blue-500 px-1 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(59,130,246,0.32)]">
                    {messagesCount > 99 ? '99+' : messagesCount}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                  'relative text-white hover:bg-white/10',
                feedMode
                    ? feedIconButtonClass
                  : 'h-9 w-9'
              )}
              onClick={() => setShowNotifications(true)}
            >
              <Bell className={cn(feedMode ? 'h-4 w-4 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]' : 'w-5 h-5 text-white')} strokeWidth={2.35} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#0b111d] bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(239,68,68,0.32)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {showMenuButton && onMenuOpen && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'text-white hover:bg-white/10',
                  feedMode
                    ? feedIconButtonClass
                    : 'h-9 w-9'
                )}
                onClick={onMenuOpen}
                aria-label="Ouvrir le menu"
              >
                <Menu className={cn(feedMode ? 'h-4 w-4 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]' : 'w-5 h-5 text-white')} strokeWidth={2.35} />
              </Button>
            )}

          </div>

        </div>

      </div>



      {/* Notification Center */}

      {authUser && (

        <NotificationCenter

          isOpen={showNotifications}

          onClose={() => setShowNotifications(false)}

          userId={authUser.id}

        />

      )}

    </header>

  );

}
