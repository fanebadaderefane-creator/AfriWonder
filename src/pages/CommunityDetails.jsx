import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Users, Heart, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function CommunityDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [communityId, setCommunityId] = useState(null);
  const [user, setUser] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [postText, setPostText] = useState('');
  const commentsEndRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCommunityId(params.get('id'));

    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {}
    };
    getUser();
  }, []);

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const c = await api.entities.Community.filter({ id: communityId });
      return c[0];
    },
    enabled: !!communityId
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: communityId }, '-created_date', 50),
    enabled: !!communityId
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['community-comments', communityId],
    queryFn: () => api.videos.getComments({ content_type: 'post', content_id: communityId }, '-created_date', 100),
    enabled: !!communityId
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['community-likes', communityId],
    queryFn: () => api.saves.list({ content_type: 'post', content_id: communityId }),
    enabled: !!communityId
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      await api.entities.CommunityMember.create({
        community_id: communityId,
        user_id: user.id,
        user_name: user.full_name,
        user_avatar: user.profile_image,
        role: 'member',
        joined_date: new Date().toISOString()
      });

      await api.entities.Community.update(communityId, {
        members_count: (community?.members_count || 0) + 1
      });

      if (community?.creator_id !== user.id) {
        // TODO: Notify community creator
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      setIsMember(true);
      toast.success('Vous avez rejoint la communauté!');
    }
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!postText.trim()) return;

      const comment = await api.videos.comment({
        content_type: 'post',
        content_id: communityId,
        author_id: user.id,
        author_name: user.full_name,
        author_avatar: user.profile_image,
        text: postText.trim()
      });

      await api.entities.Community.update(communityId, {
        posts_count: (community?.posts_count || 0) + 1
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      setPostText('');
      toast.success('Post publié!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const existingLike = likes.find(l => l.user_id === user.id);
      if (existingLike) {
        await api.saves.toggle(existingLike.id);
      } else {
        await api.videos.like({
          user_id: user.id,
          user_name: user.full_name,
          user_avatar: user.profile_image,
          content_type: 'post',
          content_id: communityId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-likes', communityId] });
    }
  });

  useEffect(() => {
    if (members.length > 0 && user?.id) {
      setIsMember(members.some(m => m.user_id === user.id));
    }
  }, [members, user?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (!community) return <div className="text-center py-12">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">{community.name}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Community Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold">{community.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{community._description}</p>
              </div>
              {!isMember && user && (
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 whitespace-nowrap"
                >
                  Rejoindre
                </Button>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {community.members_count} membres
              </span>
              <Badge variant="outline">{community.category}</Badge>
              {community.privacy_type === 'private' && (
                <Badge variant="secondary">Privée</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Post Composer */}
        {isMember && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user?.profile_image} />
                  <AvatarFallback>{user?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Partager votre pensée..."
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    onClick={() => postMutation.mutate()}
                    disabled={!postText.trim() || postMutation.isPending}
                    size="icon"
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts/Comments */}
        <AnimatePresence>
          {comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun post pour le moment
            </div>
          ) : (
            comments.map((comment, idx) => (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.author_avatar} />
                        <AvatarFallback>{comment.author_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{comment.author_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.text}</p>
                        <div className="flex gap-4 mt-3 text-xs text-gray-600">
                          <button
                            onClick={() => likeMutation.mutate()}
                            className={`flex items-center gap-1 transition-colors ${
                              likes.some(l => l.user_id === user?.id && l.content_id === communityId)
                                ? 'text-red-500'
                                : 'hover:text-red-500'
                            }`}
                          >
                            <Heart className="w-4 h-4" />
                            {likes.length}
                          </button>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            Répondre
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        <div ref={commentsEndRef} />
      </div>
    </div>
  );
}


