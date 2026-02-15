import React, { useState, useEffect } from 'react';

import { api } from '@/api/expressClient';

import { useQuery } from '@tanstack/react-query';

import { Button } from "@/components/ui/button";


import { Search, Bell, MessageCircle, WifiOff, Menu } from 'lucide-react';

import { motion } from 'framer-motion';

import { cn } from "@/lib/utils";

import { Link } from 'react-router-dom';

import { createPageUrl } from "@/utils";

import { useTranslation } from "@/components/common/useTranslation";

import NotificationCenter from "@/components/notifications/NotificationCenter";



export default function TopHeader({ 

  activeTab = 'pourtoi', 

  onTabChange, 

  showTabs = true,

  title,

  isLowData = false,

  isDarkMode = false,

  onToggleDarkMode,

  unreadNotifications = 0,

  onMenuOpen,

  followingCount = 0

}) {

  const [userLang, setUserLang] = useState('fr');

  const [showNotifications, setShowNotifications] = useState(false);

  const [user, setUser] = useState(null);

  const { t } = useTranslation();



  useEffect(() => {

    const getUserLang = async () => {

      try {

        const u = await api.auth.me();

        setUser(u);

        setUserLang(u.language || 'fr');

      } catch (e) {}

    };

    getUserLang();

  }, []);



  // Fetch notifications + messages unread count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      const data = result?.data || result;
      return data?.notifications || result?.notifications || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: messagesUnread } = useQuery({
    queryKey: ['messages-unread-count'],
    queryFn: () => api.messages.getUnreadCount(),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const messagesCount = messagesUnread?.count ?? 0;



  return (

    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none safe-area-pt">

      <div className="pointer-events-auto">

        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">

          {/* Left side */}

          <div className="flex items-center gap-2">

            {isLowData && (

              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full text-xs">

                <WifiOff className="w-3 h-3" />

                <span className="font-medium">Lite</span>

              </div>

            )}

          </div>



          {/* Center - Tabs or Title */}

           {showTabs ? (

            <div className="flex items-center gap-2 sm:gap-6">

              <button

                onClick={() => onTabChange('abonnements')}

                className={cn(

                  "text-sm sm:text-base font-semibold transition-all flex items-center gap-1.5",

                  activeTab === 'abonnements' 

                    ? "text-white" 

                    : "text-white/50"

                )}

              >

                {t('my_wonder')}

                {followingCount > 0 && activeTab === 'abonnements' && (

                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">

                    {followingCount}

                  </span>

                )}

              </button>

              <button

                onClick={() => onTabChange('pourtoi')}

                className={cn(

                  "text-sm sm:text-base font-semibold transition-all relative",

                  activeTab === 'pourtoi' 

                    ? "text-white" 

                    : "text-white/50"

                )}

              >

                {t('forYou')}

                {activeTab === 'pourtoi' && (

                  <motion.div

                    layoutId="underline"

                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"

                  />

                )}

              </button>

            </div>

          ) : (

           <h1 className="text-white text-base sm:text-lg font-bold">{title}</h1>

          )}



          {/* Right side */}

          <div className="flex items-center gap-1">

            <Link to={createPageUrl('Search')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
                <Search className="w-5 h-5" />
              </Button>
            </Link>

            <Link to={createPageUrl('Inbox')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 relative">
                <MessageCircle className="w-5 h-5" />
                {messagesCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {messagesCount > 99 ? '99+' : messagesCount}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9 relative"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            <Button 

              variant="ghost" 

              size="icon" 

              className="text-white hover:bg-white/10 h-9 w-9"

              onClick={onMenuOpen}

            >

              <Menu className="w-5 h-5" />

            </Button>

          </div>

        </div>

      </div>



      {/* Notification Center */}

      {user && (

        <NotificationCenter

          isOpen={showNotifications}

          onClose={() => setShowNotifications(false)}

          userId={user.id}

        />

      )}

    </header>

  );

}
