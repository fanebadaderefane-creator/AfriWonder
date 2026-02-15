import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/navigation/BottomNav';

export default function Inbox() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ['messages-conversations', user?.id],
    queryFn: () => api.messages.getConversations(1, 20),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const conversations = data?.conversations ?? [];
  const filteredConversations = conversations.filter((conv) => {
    const name = conv.other?.full_name || conv.other?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <Link to={createPageUrl('Search')}>
            <Button variant="ghost" size="icon">
              <Edit className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 rounded-xl border-gray-200 bg-gray-100 focus:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="px-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Chargement des conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pas encore de messages</h3>
            <p className="text-gray-500 mb-6 max-w-[260px]">Échangez avec les créateurs et vendeurs de la communauté AfriWonder</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate(createPageUrl('Discover'))} variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                Découvrir des créateurs
              </Button>
              <Button onClick={() => navigate(createPageUrl('Marketplace'))} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                Explorer le marketplace
              </Button>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const other = conv.other || {};
            const otherName = other.full_name || other.username || 'Utilisateur';
            const otherAvatar = other.profile_image;
            const otherUserId = other.id;
            const unreadCount = conv.unread_count ?? 0;

            return (
              <Link key={conv.id} to={`${createPageUrl('Chat')}?_userId=${otherUserId}`}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-white active:bg-gray-100 transition-colors rounded-xl mx-2 my-1"
                >
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-semibold">
                      {otherName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
                        {otherName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {conv.last_message_text || 'Aucun message'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
