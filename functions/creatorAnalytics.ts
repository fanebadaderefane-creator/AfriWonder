import { base44 } from "@/api/base44Client";

export async function recordVideoAnalytics(videoId, creatorId, metrics) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await base44.entities.VideoAnalytics.filter({
      video_id: videoId,
      creator_id: creatorId,
      date: today
    });

    if (existing && existing.length > 0) {
      return await base44.entities.VideoAnalytics.update(existing[0].id, {
        ...metrics,
        engagement_rate: calculateEngagementRate(metrics)
      });
    } else {
      return await base44.entities.VideoAnalytics.create({
        video_id: videoId,
        creator_id: creatorId,
        date: today,
        ...metrics,
        engagement_rate: calculateEngagementRate(metrics)
      });
    }
  } catch (error) {
    console.error("Analytics recording error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCreatorDashboard(creatorId) {
  try {
    const videos = await base44.entities.Video.filter({ creator_id: creatorId });
    const analytics = await base44.entities.VideoAnalytics.filter({
      creator_id: creatorId
    });

    // Get last 30 days analytics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAnalytics = analytics.filter(a => new Date(a.date) >= thirtyDaysAgo);

    const stats = {
      total_videos: videos?.length || 0,
      total_views: recentAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
      total_engagement: recentAnalytics.reduce((sum, a) => sum + (a.likes + a.comments + a.shares || 0), 0),
      avg_watch_time: Math.round(recentAnalytics.reduce((sum, a) => sum + (a.watch_time_minutes || 0), 0) / (recentAnalytics.length || 1)),
      avg_engagement_rate: Math.round(recentAnalytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0) / (recentAnalytics.length || 1) * 100) / 100,
      total_revenue: recentAnalytics.reduce((sum, a) => sum + (a.revenue || 0), 0)
    };

    // Top videos
    const topVideos = videos
      ?.map(v => {
        const videoAnalytics = analytics.filter(a => a.video_id === v.id && new Date(a.date) >= thirtyDaysAgo);
        return {
          ...v,
          views_30d: videoAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
          revenue_30d: videoAnalytics.reduce((sum, a) => sum + (a.revenue || 0), 0)
        };
      })
      .sort((a, b) => (b.views_30d || 0) - (a.views_30d || 0))
      .slice(0, 5) || [];

    // Trending data for charts
    const dailyData = {};
    recentAnalytics.forEach(a => {
      if (!dailyData[a.date]) {
        dailyData[a.date] = { views: 0, engagement: 0, revenue: 0 };
      }
      dailyData[a.date].views += a.views || 0;
      dailyData[a.date].engagement += (a.likes + a.comments + a.shares || 0);
      dailyData[a.date].revenue += a.revenue || 0;
    });

    const trendData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      success: true,
      stats,
      topVideos,
      trendData,
      analyticsData: recentAnalytics
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function bulkUploadVideos(creatorId, videos) {
  try {
    const uploaded = [];
    const failed = [];

    for (const video of videos) {
      try {
        const created = await base44.entities.Video.create({
          creator_id: creatorId,
          creator_name: video.creator_name,
          creator_avatar: video.creator_avatar,
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          category: video.category || "other",
          tags: video.tags || [],
          visibility: video.visibility || "public"
        });
        uploaded.push(created);
      } catch (error) {
        failed.push({
          video: video.title,
          error: error.message
        });
      }
    }

    return {
      success: true,
      uploaded: uploaded.length,
      failed: failed.length,
      details: { uploaded, failed }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function setupRevenueSharing(videoId, collaborators) {
  try {
    const totalPercentage = collaborators.reduce((sum, c) => sum + c.percentage, 0);
    
    if (totalPercentage > 100) {
      return { success: false, error: "Total percentage cannot exceed 100%" };
    }

    const created = [];
    for (const collaborator of collaborators) {
      const share = await base44.entities.CollaboratorRevenue.create({
        creator_id: collaborator.creator_id,
        video_id: videoId,
        collaborator_id: collaborator.id,
        collaborator_name: collaborator.name,
        contribution_percentage: collaborator.percentage
      });
      created.push(share);
    }

    return {
      success: true,
      shares: created,
      message: `Revenue sharing setup for ${created.length} collaborators`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getRevenueReport(creatorId) {
  try {
    const shares = await base44.entities.CollaboratorRevenue.filter({
      creator_id: creatorId
    });

    const report = {
      total_collaborators: new Set(shares?.map(s => s.collaborator_id) || []).size,
      pending_payouts: shares?.filter(s => s.status === 'pending')?.length || 0,
      paid_payouts: shares?.filter(s => s.status === 'paid')?.length || 0,
      total_distributed: shares?.reduce((sum, s) => sum + (s.collaborator_earnings || 0), 0) || 0,
      byCollaborator: {}
    };

    shares?.forEach(s => {
      if (!report.byCollaborator[s.collaborator_id]) {
        report.byCollaborator[s.collaborator_id] = {
          name: s.collaborator_name,
          earnings: 0,
          videos: 0,
          status_counts: { pending: 0, paid: 0, failed: 0 }
        };
      }
      report.byCollaborator[s.collaborator_id].earnings += s.collaborator_earnings || 0;
      report.byCollaborator[s.collaborator_id].videos += 1;
      report.byCollaborator[s.collaborator_id].status_counts[s.status || 'pending']++;
    });

    return { success: true, report };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function calculateEngagementRate(metrics) {
  if (!metrics.views || metrics.views === 0) return 0;
  const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
  return (engagement / metrics.views) * 100;
}

export async function getAudienceDemographics(creatorId) {
  try {
    const analytics = await base44.entities.VideoAnalytics.filter({
      creator_id: creatorId
    });

    const demographics = {
      locations: {},
      ages: {},
      gender: { male: 0, female: 0, other: 0 },
      topCountries: []
    };

    analytics?.forEach(a => {
      if (a.audience_location) {
        a.audience_location.forEach(loc => {
          demographics.locations[loc.country] = (demographics.locations[loc.country] || 0) + loc.count;
        });
      }
      if (a.audience_gender) {
        Object.keys(a.audience_gender).forEach(key => {
          demographics.gender[key] = (demographics.gender[key] || 0) + (a.audience_gender[key] || 0);
        });
      }
    });

    demographics.topCountries = Object.entries(demographics.locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    return { success: true, demographics };
  } catch (error) {
    return { success: false, error: error.message };
  }
}