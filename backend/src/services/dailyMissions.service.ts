/**
 * AfriWonder - Missions journalières (rétention)
 * Ex: "Poste 1 vidéo aujourd'hui", "Atteins 1000 vues"
 * Récompense = XP
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const MISSIONS = [
  { type: 'post_video', label: 'Poste 1 vidéo aujourd\'hui', xp: 50, icon: '🎬' },
  { type: 'reach_1000_views', label: 'Atteins 1000 vues sur une vidéo', xp: 30, icon: '👁️' },
] as const;

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDailyMissions(userId: string) {
  const completed = await prisma.dailyMissionCompletion.findMany({
    where: {
      user_id: userId,
      completed_date: todayDate(),
    },
    select: { mission_type: true },
  });
  const completedSet = new Set(completed.map((c) => c.mission_type));

  return MISSIONS.map((m) => ({
    ...m,
    completed: completedSet.has(m.type),
  }));
}

export async function completeMission(
  userId: string,
  missionType: string,
  opts?: { videoId?: string }
): Promise<{ awarded: boolean; xp?: number }> {
  const mission = MISSIONS.find((m) => m.type === missionType);
  if (!mission) return { awarded: false };

  const today = todayDate();
  const existing = await prisma.dailyMissionCompletion.findUnique({
    where: {
      user_id_mission_type_completed_date: {
        user_id: userId,
        mission_type: missionType,
        completed_date: today,
      },
    },
  });
  if (existing) return { awarded: false };

  await prisma.dailyMissionCompletion.create({
    data: {
      user_id: userId,
      mission_type: missionType,
      completed_date: today,
    },
  });
  const xp = mission.xp;
  const { addXp } = await import('./gamification.service.js');
  await addXp(userId, xp, `daily_mission_${missionType}`).catch(() => {});
  logger.info('Daily mission completed', { userId, missionType, xp });
  return { awarded: true, xp };
}

export async function checkAndAwardPostVideo(userId: string): Promise<void> {
  const today = todayDate();
  const count = await prisma.video.count({
    where: {
      creator_id: userId,
      created_at: { gte: today },
    },
  });
  if (count >= 1) {
    await completeMission(userId, 'post_video').catch(() => {});
  }
}

export async function checkAndAwardReach1000Views(creatorId: string, videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { views: true },
  });
  if (!video || video.views < 1000) return;
  await completeMission(creatorId, 'reach_1000_views', { videoId }).catch(() => {});
}
