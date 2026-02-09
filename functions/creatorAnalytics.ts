import { api } from "@/api/expressClient";

function calculateEngagementRate(metrics: { views?: number; likes?: number; comments?: number; shares?: number }) {
  if (!metrics.views || metrics.views === 0) return 0;
  const engagement = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0);
  return (engagement / metrics.views) * 100;
}

export async function recordVideoAnalytics(
  videoId: string,
  creatorId: string,
  metrics: { views?: number; likes?: number; comments?: number; shares?: number; watch_time_minutes?: number }
) {
  try {
    await api.analytics.recordVideo({
      video_id: videoId,
      creator_id: creatorId,
      ...metrics,
      engagement_rate: calculateEngagementRate(metrics),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Analytics recording error:", error);
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function getCreatorDashboard(creatorId: string) {
  try {
    const [videosRes, analyticsRes] = await Promise.all([
      api.videos.list({ creator_id: creatorId, page: 1, limit: 500 }),
      api.analytics.getCreatorAnalytics(creatorId),
    ]);

    const videos = Array.isArray(videosRes) ? videosRes : (videosRes as any)?.videos ?? (videosRes as any)?.data ?? [];
    const result = analyticsRes as any;
    const analytics = result?.analytics ?? (Array.isArray(analyticsRes) ? analyticsRes : []);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAnalytics = analytics.filter((a: any) => new Date(a.date) >= thirtyDaysAgo);

    const stats = {
      total_videos: videos.length,
      total_views: recentAnalytics.reduce((sum: number, a: any) => sum + (a.views ?? 0), 0),
      total_engagement: recentAnalytics.reduce((sum: number, a: any) => sum + ((a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0)), 0),
      avg_watch_time: Math.round(recentAnalytics.reduce((sum: number, a: any) => sum + (a.watch_time_minutes ?? 0), 0) / (recentAnalytics.length || 1)),
      avg_engagement_rate: Math.round((recentAnalytics.reduce((sum: number, a: any) => sum + (a.engagement_rate ?? 0), 0) / (recentAnalytics.length || 1)) * 100) / 100,
      total_revenue: recentAnalytics.reduce((sum: number, a: any) => sum + (a.revenue ?? 0), 0),
    };

    const topVideos = videos
      .map((v: any) => {
        const videoAnalytics = analytics.filter((a: any) => a.video_id === v.id && new Date(a.date) >= thirtyDaysAgo);
        return {
          ...v,
          views_30d: videoAnalytics.reduce((sum: number, a: any) => sum + (a.views ?? 0), 0),
          revenue_30d: videoAnalytics.reduce((sum: number, a: any) => sum + (a.revenue ?? 0), 0),
        };
      })
      .sort((a: any, b: any) => (b.views_30d ?? 0) - (a.views_30d ?? 0))
      .slice(0, 5);

    const dailyData: Record<string, { views: number; engagement: number; revenue: number }> = {};
    recentAnalytics.forEach((a: any) => {
      const date = typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0];
      if (!dailyData[date]) dailyData[date] = { views: 0, engagement: 0, revenue: 0 };
      dailyData[date].views += a.views ?? 0;
      dailyData[date].engagement += (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0);
      dailyData[date].revenue += a.revenue ?? 0;
    });
    const trendData = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      stats,
      topVideos,
      trendData,
      analyticsData: recentAnalytics,
    };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function bulkUploadVideos(creatorId: string, videos: any[]) {
  try {
    const uploaded: any[] = [];
    const failed: { video: string; error: string }[] = [];
    for (const video of videos) {
      try {
        const created = await api.videos.create({
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          category: video.category ?? "other",
          visibility: video.visibility ?? "public",
        });
        uploaded.push(created);
      } catch (err: any) {
        failed.push({ video: video.title, error: err?.message ?? String(err) });
      }
    }
    return { success: true, uploaded: uploaded.length, failed: failed.length, details: { uploaded, failed } };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function setupRevenueSharing(_videoId: string, collaborators: any[]) {
  const totalPercentage = collaborators.reduce((sum: number, c: any) => sum + (c.percentage ?? 0), 0);
  if (totalPercentage > 100) {
    return { success: false, error: "Total percentage cannot exceed 100%" };
  }
  return { success: false, error: "Partage de revenus non implémenté côté API. À ajouter au backend si besoin." };
}

export async function getRevenueReport(_creatorId: string) {
  return {
    success: true,
    report: {
      total_collaborators: 0,
      pending_payouts: 0,
      paid_payouts: 0,
      total_distributed: 0,
      byCollaborator: {},
    },
  };
}

export async function getAudienceDemographics(creatorId: string) {
  try {
    const result = await api.analytics.getCreatorAnalytics(creatorId) as any;
    const analytics = result?.analytics ?? (Array.isArray(result) ? result : []);
    const demographics = {
      locations: {} as Record<string, number>,
      ages: {} as Record<string, number>,
      gender: { male: 0, female: 0, other: 0 } as Record<string, number>,
      topCountries: [] as { country: string; count: number }[],
    };
    analytics.forEach((a: any) => {
      const loc = a.audience_location;
      if (Array.isArray(loc)) {
        loc.forEach((item: any) => {
          const country = item.country ?? item;
          const count = typeof item === "object" ? item.count ?? 1 : 1;
          demographics.locations[country] = (demographics.locations[country] ?? 0) + count;
        });
      }
      const g = a.audience_gender;
      if (g && typeof g === "object") {
        Object.keys(g).forEach((key) => {
          demographics.gender[key] = (demographics.gender[key] ?? 0) + (g[key] ?? 0);
        });
      }
    });
    demographics.topCountries = Object.entries(demographics.locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));
    return { success: true, demographics };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}
