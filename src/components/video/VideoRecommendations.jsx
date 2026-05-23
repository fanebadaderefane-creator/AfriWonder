import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoRecommendationEngine } from "@/functions/videoRecommendationEngine";
import { api } from "@/api/expressClient";
import VideoCard from "./VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function VideoRecommendations({ userId, videoId = null, limit = 10, type = "personalized" }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await api.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: recommendedVideos, isLoading, error } = useQuery({
    queryKey: ["videoRecommendations", userId, videoId, type],
    queryFn: async () => {
      if (type === "personalized" && userId) {
        return await VideoRecommendationEngine.getPersonalizedRecommendations(userId, limit);
      } else if (type === "similar" && videoId) {
        return await VideoRecommendationEngine.getSimilarVideos(videoId, limit);
      } else if (type === "trending") {
        return await VideoRecommendationEngine.getTrendingVideos(limit);
      }
      return [];
    },
    enabled: !!userId || !!videoId || type === "trending"
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-5 h-5" />
        <span>Erreur lors du chargement des recommandations</span>
      </div>
    );
  }

  if (!recommendedVideos || recommendedVideos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Aucune vidéo recommandée disponible</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendedVideos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          user={user}
        />
      ))}
    </div>
  );
}
