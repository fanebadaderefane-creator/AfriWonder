import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function StoriesPage() {
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(0);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [autoProgress, _setAutoProgress] = useState(true);

  const { data: stories } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const user = await api.auth.me();
      const followingList = await api.users.getFollowing({ follower_id: user.id });
      const followingIds = followingList.map(f => f.following_id);

      const storyList = await api.entities.Story.filter({
        creator_id: { $in: followingIds }
      });

      return storyList.filter(s => new Date(s.expires_at) > new Date());
    }
  });

  // Grouper les stories par créateur
  const storyGroups = stories?.reduce((acc, story) => {
    const existing = acc.find(g => g.creator_id === story.creator_id);
    if (existing) {
      existing.stories.push(story);
    } else {
      acc.push({
        creator_id: story.creator_id,
        creator_name: story.creator_name,
        creator_avatar: story.creator_avatar,
        stories: [story]
      });
    }
    return acc;
  }, []) || [];

  const currentGroup = storyGroups[selectedStoryIdx];
  const currentStory = currentGroup?.stories[currentStoryIdx];

  useEffect(() => {
    if (!autoProgress || !currentStory) return;

    const timer = setTimeout(() => {
      if (currentStoryIdx < currentGroup.stories.length - 1) {
        setCurrentStoryIdx(currentStoryIdx + 1);
      } else if (selectedStoryIdx < storyGroups.length - 1) {
        setSelectedStoryIdx(selectedStoryIdx + 1);
        setCurrentStoryIdx(0);
      }
    }, currentStory.duration * 1000);

    return () => clearTimeout(timer);
  }, [autoProgress, currentStoryIdx, selectedStoryIdx, currentStory, currentGroup, storyGroups.length]);

  if (!currentStory) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <p className="text-white text-lg">Aucune story à afficher</p>
      </div>
    );
  }

  const handleReact = async (emoji) => {
    const user = await api.auth.me();
    await api.entities.Story.update(currentStory.id, {
      reactions: [
        ...(currentStory.reactions || []),
        { user_id: user.id, emoji, timestamp: new Date().toISOString() }
      ]
    });
  };

  const reactionCounts = currentStory.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {}) || {};

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
              <button
                onClick={() => window.history.back()}
                className="text-white p-2 hover:bg-white/20 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress bars */}
            <div className="flex gap-1">
              {currentGroup.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: idx < currentStoryIdx ? '100%' : idx === currentStoryIdx ? '100%' : '0%' }}
                    transition={{ duration: currentStory.duration }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-24 left-0 right-0 px-4 z-20">
              <p className="text-white text-sm bg-black/40 backdrop-blur p-2 rounded">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Reactions */}
          <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
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

