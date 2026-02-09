import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Compass, PlusSquare, MessageSquare, User, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/components/common/useTranslation';
import { api } from '@/api/expressClient';

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  const { data: unreadData } = useQuery({
    queryKey: ['messages-unread-count'],
    queryFn: () => api.messages.getUnreadCount(),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('access_token'),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems = [

    { id: 'home', icon: Home, label: t('home'), page: 'Home' },

    { id: 'discover', icon: Compass, label: t('discover'), page: 'Discover' },

    { id: 'create', icon: PlusSquare, label: '', page: 'Create', isCreate: true },

    { id: 'live', icon: Radio, label: 'Live', page: 'LiveStream' },

    { id: 'inbox', icon: MessageSquare, label: t('inbox'), page: 'Inbox' },

    { id: 'profile', icon: User, label: t('profile'), page: 'Profile' },

  ];

  

  const isActive = (page) => {

    return location.pathname.includes(page.toLowerCase());

  };

  return (

    <nav 

      className="fixed bottom-0 left-0 right-0 h-[80px] bg-black/50 backdrop-blur-md border-t border-white/10 z-[50]"

      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}

    >

      <div className="w-full h-full flex items-center justify-around px-2">

        {navItems.map((item) => {

          const Icon = item.icon;

          const active = isActive(item.page);

          

          if (item.isCreate) {

            return (

              <Link

                key={item.id}

                to={createPageUrl(item.page)}

                className="relative"

              >

                <motion.div

                  whileTap={{ scale: 0.9 }}

                  className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"

                >

                  <Icon className="w-6 h-6 text-white" />

                </motion.div>

              </Link>

            );

          }

          

          return (

            <Link

              key={item.id}

              to={createPageUrl(item.page)}

              className="flex flex-col items-center gap-1 py-2 px-3"

            >

              <motion.div

                whileTap={{ scale: 0.9 }}

                className="relative"

              >

                <Icon 

                  className={cn(

                    "w-6 h-6 transition-colors",

                    active ? "text-orange-500" : "text-white/70"

                  )} 

                />

                {item.id === 'inbox' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}

              </motion.div>

              <span className={cn(

                "text-[10px] transition-colors",

                active ? "text-orange-500 font-semibold" : "text-white/60"

              )}>

                {item.label}

              </span>

              {active && (

                <motion.div

                  layoutId="activeTab"

                  className="absolute bottom-0 w-1 h-1 bg-orange-500 rounded-full"

                />

              )}

            </Link>

          );

        })}

      </div>

    </nav>

  );

}
