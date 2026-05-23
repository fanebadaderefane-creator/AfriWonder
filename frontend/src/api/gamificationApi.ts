import { mobileApiClient } from './mobileClient';

export type UserBadgeRow = {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string;
  badge_description?: string | null;
  category?: string | null;
  earned_date?: string;
};

export type GamificationMe = {
  total_points?: number;
  level?: number;
  current_level_points?: number;
  points_for_next_level?: number;
  lifetime_points?: number;
  badges_count?: number;
  badges?: UserBadgeRow[];
  next_level_progress?: number;
};

export async function fetchGamificationMe(): Promise<GamificationMe> {
  const { data } = await mobileApiClient.get<{ success?: boolean; data?: GamificationMe }>('/gamification/me');
  return data?.data ?? {};
}

export type DailyMission = {
  type: string;
  label: string;
  xp: number;
  icon: string;
  completed: boolean;
};

export async function fetchDailyMissions(): Promise<DailyMission[]> {
  const { data } = await mobileApiClient.get<{ success?: boolean; data?: DailyMission[] }>('/gamification/daily-missions');
  return Array.isArray(data?.data) ? data.data : [];
}

export type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rank: number;
  total_points: number;
  level: number;
  badges_count?: number;
};

export async function fetchLeaderboard(params?: { range?: string; limit?: number }): Promise<{
  leaderboard: LeaderboardEntry[];
  period: string;
}> {
  const { data } = await mobileApiClient.get<{
    success?: boolean;
    leaderboard?: LeaderboardEntry[];
    period?: string;
  }>('/leaderboard', {
    params: { range: params?.range ?? 'all', limit: params?.limit ?? 50 },
  });
  return {
    leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : [],
    period: data?.period ?? 'all',
  };
}
