import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { ChevronDown } from 'lucide-react';

const DEFAULT_VISIBLE = 8;

export default function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAllFollowers, setShowAllFollowers] = useState(false);
  const [showAllFollowing, setShowAllFollowing] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
    enabled: isOpen,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userId, isOpen],
    queryFn: async () => {
      const result = await api.users.getFollowers(userId, { page: 1, limit: 100 });
      return Array.isArray(result?.followers) ? result.followers : [];
    },
    enabled: isOpen && !!userId,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userId, isOpen],
    queryFn: async () => {
      const result = await api.users.getFollowing(userId, { page: 1, limit: 100 });
      return Array.isArray(result?.following) ? result.following : [];
    },
    enabled: isOpen && !!userId,
  });

  const { data: myFollowing = [] } = useQuery({
    queryKey: ['my-following', currentUser?.id],
    queryFn: async () => {
      const result = await api.users.getFollowing(currentUser.id, { page: 1, limit: 200 });
      return Array.isArray(result?.following) ? result.following : [];
    },
    enabled: isOpen && !!currentUser?.id,
  });

  const myFollowingSet = useMemo(() => new Set(myFollowing.map((u) => u.id)), [myFollowing]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['followers-modal-suggestions', currentUser?.id, userId, followers.length, following.length, myFollowing.length],
    queryFn: async () => {
      const users = await api.users.list({ page: 1, limit: 50 });
      const blocked = new Set([
        ...followers.map((u) => u.id),
        ...following.map((u) => u.id),
        ...myFollowing.map((u) => u.id),
        currentUser?.id,
        userId,
      ].filter(Boolean));
      return users.filter((u) => !blocked.has(u.id)).slice(0, 24);
    },
    enabled: isOpen && !!currentUser?.id && !!userId,
  });

  const toggleWonderMutation = useMutation({
    mutationFn: (targetId) => api.users.toggleWonder(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-following', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following', userId] });
      queryClient.invalidateQueries({ queryKey: ['follow-stats', userId] });
    },
  });

  const handleUserClick = (targetUser) => {
    onClose();
    navigate(`${createPageUrl('Profile')}?_userId=${targetUser.id}`);
  };

  const visibleFollowers = showAllFollowers ? followers : followers.slice(0, DEFAULT_VISIBLE);
  const visibleFollowing = showAllFollowing ? following : following.slice(0, DEFAULT_VISIBLE);
  const visibleSuggestions = showAllSuggested ? suggestions : suggestions.slice(0, DEFAULT_VISIBLE);

  const UserList = ({ users, showAll, setShowAll, showFollowButton = true }) => (
    <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
      {users.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Aucun utilisateur</p>
      ) : (
        users.map((targetUser, index) => {
          const isMe = targetUser.id === currentUser?.id;
          const isFollowingTarget = myFollowingSet.has(targetUser.id);
          return (
            <motion.div
              key={targetUser.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleUserClick(targetUser)}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={targetUser.profile_image} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {(targetUser.full_name || targetUser.username || 'U')?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{targetUser.full_name || targetUser.username || 'Utilisateur'}</p>
                <p className="text-sm text-gray-400 truncate">@{targetUser.username || targetUser.email?.split('@')[0] || 'afriwonder'}</p>
              </div>
              {showFollowButton && !isMe && (
                <Button
                  size="sm"
                  disabled={toggleWonderMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWonderMutation.mutate(targetUser.id);
                  }}
                  className={isFollowingTarget
                    ? "rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}
                >
                  {isFollowingTarget ? 'Suivi' : 'Suivre'}
                </Button>
              )}
            </motion.div>
          );
        })
      )}

      {showAll !== undefined && users.length >= DEFAULT_VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
        >
          <span>{showAll ? 'Voir moins' : 'Tout voir'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wonder - Communaute</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="followers">
              Wonderers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Dans leur Wonder ({following.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4 space-y-4">
            <UserList users={visibleFollowers} showAll={showAllFollowers} setShowAll={setShowAllFollowers} />
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Comptes suggeres</p>
              <UserList users={visibleSuggestions} showAll={showAllSuggested} setShowAll={setShowAllSuggested} />
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <UserList users={visibleFollowing} showAll={showAllFollowing} setShowAll={setShowAllFollowing} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
