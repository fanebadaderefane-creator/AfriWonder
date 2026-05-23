import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const STORY_DURATION_SEC = 5;

export default function StoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(0);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [autoProgress, _setAutoProgress] = useState(true);
  const [pollVoted, setPollVoted] = useState({}); // pollId -> optionIndex

  const { data: stories } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const user = await api.auth.me();
      const followingList = await api.users.getFollowing({ follower_id: user.id }).catch(() => []);
      const followingIds = (followingList || []).map(f => f.following_id);
      const ids = followingIds.length ? followingIds : [user.id];
      const list = await api.stories.list(ids);
      return Array.isArray(list) ? list : [];
    }
  });

  // Grouper les stories par créateur (user_id + user)
  const storyGroups = stories?.reduce((acc, story) => {
    const uid = story.user_id || story.user?.id;
    const existing = acc.find(g => g.creator_id === uid);
    const creator_name = story.user?.username || story.user?.full_name || 'Utilisateur';
    const creator_avatar = story.user?.profile_image;
    if (existing) {
      existing.stories.push(story);
    } else {
      acc.push({
        creator_id: uid,
        creator_name,
        creator_avatar,
        stories: [story]
      });
    }
    return acc;
  }, []) || [];

  const currentGroup = storyGroups[selectedStoryIdx];
  const currentStory = currentGroup?.stories[currentStoryIdx];

  const durationSec = currentStory?.duration != null ? currentStory.duration : STORY_DURATION_SEC;

  useEffect(() => {
    if (!autoProgress || !currentStory || !currentGroup) return;

    const timer = setTimeout(() => {
      if (currentStoryIdx < currentGroup.stories.length - 1) {
        setCurrentStoryIdx(currentStoryIdx + 1);
      } else if (selectedStoryIdx < storyGroups.length - 1) {
        setSelectedStoryIdx(selectedStoryIdx + 1);
        setCurrentStoryIdx(0);
      }
    }, durationSec * 1000);

    return () => clearTimeout(timer);
  }, [autoProgress, currentStoryIdx, selectedStoryIdx, currentStory, currentGroup, storyGroups.length, durationSec]);

  const reactionMutation = useMutation({
    mutationFn: ({ storyId, emoji }) => api.stories.addReaction(storyId, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
  });

  const handleReact = (emoji) => {
    reactionMutation.mutate({ storyId: currentStory.id, emoji });
  };

  const pollVoteMutation = useMutation({
    mutationFn: ({ pollId, optionIndex }) => api.stories.votePoll(pollId, optionIndex),
    onSuccess: (_, { pollId, optionIndex }) => {
      setPollVoted(prev => ({ ...prev, [pollId]: optionIndex }));
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const reactionCounts = currentStory?.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {}) || {};

  const currentPoll = currentStory?.poll;
  const options = Array.isArray(currentPoll?.options) ? currentPoll.options : [];
  const voteCounts = currentPoll?.votes?.reduce((acc, v) => {
    acc[v.option_index] = (acc[v.option_index] || 0) + 1;
    return acc;
  }, {}) || {};
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const hasVoted = currentPoll && pollVoted[currentPoll.id] !== undefined;

  useEffect(() => {
    if (!currentStory?.id) return;
    api.stories.view(currentStory.id).catch(() => {});
  }, [currentStory?.id]);

  if (!currentStory) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white text-lg">Aucune story à afficher</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl text-white"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full relative"
        >
          {/* Story Media */}
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={currentStory.media_url}
              autoPlay
              className="w-full h-full object-cover"
            />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={currentGroup.creator_avatar} />
                  <AvatarFallback>{currentGroup.creator_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold text-sm">{currentGroup.creator_name}</p>
                  <p className="text-gray-300 text-xs">
                    {Math.floor(Math.random() * 60)}m ago
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full text-white hover:bg-white/20" aria-label="Retour">
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Progress bars */}
            <div className="flex gap-1">
              {currentGroup.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: idx < currentStoryIdx ? '100%' : idx === currentStoryIdx ? '100%' : '0%' }}
                    transition={{ duration: durationSec }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sondage (CPO 2.21) */}
          {currentPoll && options.length > 0 && (
            <div className="absolute bottom-28 left-4 right-4 z-20 bg-black/50 backdrop-blur rounded-xl p-3">
              <p className="text-white font-medium text-sm mb-2">{currentPoll.question}</p>
              <div className="space-y-2">
                {options.map((label, idx) => {
                  const count = voteCounts[idx] || 0;
                  const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                  const isSelected = hasVoted && pollVoted[currentPoll.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => !hasVoted && pollVoteMutation.mutate({ pollId: currentPoll.id, optionIndex: idx })}
                      disabled={hasVoted}
                      className={`w-full text-left text-sm py-2 px-3 rounded-lg border transition ${
                        isSelected ? 'bg-white/30 border-white' : 'bg-white/10 border-white/30 text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {hasVoted && <span className="ml-2 opacity-80">{Math.round(pct)}%</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reactions (CPO 2.19) */}
          <div className={`absolute left-0 right-0 px-4 z-20 ${currentPoll ? 'bottom-20' : 'bottom-6'}`}>
            <div className="flex gap-2 justify-center flex-wrap bg-black/40 backdrop-blur p-2 rounded-full w-fit mx-auto">
              {['❤️', '😂', '😍', '😮', '😢', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`text-lg p-1 transition-all ${
                    reactionCounts[emoji] ? 'scale-125' : 'hover:scale-110'
                  }`}
                  title={reactionCounts[emoji] ? `${reactionCounts[emoji]} personnes` : ''}
                >
                  {emoji}
                  {reactionCounts[emoji] && (
                    <span className="text-white text-xs ml-1">
                      {reactionCounts[emoji] > 99 ? '99+' : reactionCounts[emoji]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          {currentStoryIdx > 0 && (
            <button
              onClick={() => setCurrentStoryIdx(currentStoryIdx - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white p-2 hover:bg-white/20 rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentStoryIdx < currentGroup.stories.length - 1 && (
            <button
              onClick={() => setCurrentStoryIdx(currentStoryIdx + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white p-2 hover:bg-white/20 rounded-full"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

