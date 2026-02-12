import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }) {
  const navigate = useNavigate();
  
  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const follows = await api.users.getFollowing(userId);
      const followerIds = follows.map(f => f.follower_id);
      if (followerIds.length === 0) return [];
      const users = await [];
      return users.filter(u => followerIds.includes(u.id));
    },
    enabled: isOpen && !!userId,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const follows = await api.users.getFollowing(userId);
      const followingIds = follows.map(f => f.following_id);
      if (followingIds.length === 0) return [];
      const users = await Promise.all(
        followingIds.map(id => 
          [].then(u => u[0])
        )
      );
      return users.filter(Boolean);
    },
    enabled: isOpen && !!userId,
  });

  const handleUserClick = (user) => {
    onClose();
    navigate(`${createPageUrl('Profile')}?userId=${user.id}`);
  };

  const UserList = ({ users }) => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {users.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Aucun utilisateur</p>
      ) : (
        users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleUserClick(user)}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{user.full_name || 'Utilisateur'}</p>
              <p className="text-sm text-gray-400">@{user.email?.split('@')[0]}</p>
            </div>
            <Button 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleUserClick(user);
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full"
            >
              Voir
            </Button>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wonder — Communauté</DialogTitle>
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
          
          <TabsContent value="followers" className="mt-4">
            <UserList users={followers} />
          </TabsContent>
          
          <TabsContent value="following" className="mt-4">
            <UserList users={following} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

