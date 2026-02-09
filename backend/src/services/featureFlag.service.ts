/**
 * Feature flags — activation/désactivation sans déploiement.
 */
import prisma from '../config/database.js';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { enabled: boolean; at: number }>();

async function getFlag(key: string): Promise<boolean> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.enabled;
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  const enabled = row?.enabled ?? false;
  cache.set(key, { enabled, at: Date.now() });
  return enabled;
}

export async function isEnabled(key: string): Promise<boolean> {
  return getFlag(key);
}

export async function setFlag(key: string, enabled: boolean, description?: string): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled, description },
    update: { enabled, description: description ?? undefined },
  });
  cache.delete(key);
}

export async function listFlags(): Promise<{ key: string; enabled: boolean; description: string | null }[]> {
  return prisma.featureFlag.findMany({
    select: { key: true, enabled: true, description: true },
    orderBy: { key: 'asc' },
  });
}

const featureFlagService = { isEnabled, setFlag, listFlags };
export default featureFlagService;
