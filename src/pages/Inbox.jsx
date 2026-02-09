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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Messages</h1>
          <Link to={createPageUrl('Search')}>
            <Button variant="ghost" size="icon">
              <Edit className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200 bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pas encore de messages</h3>
            <p className="text-gray-500 mb-6">Commencez à échanger avec la communauté</p>
            <Button onClick={() => navigate(createPageUrl('Marketplace'))} className="bg-gradient-to-r from-orange-500 to-red-500">
              Découvrir le marketplace
            </Button>
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                >
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                      {otherName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800 truncate">{otherName}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">{conv.last_message_text || '—'}</p>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {unreadCount}
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
