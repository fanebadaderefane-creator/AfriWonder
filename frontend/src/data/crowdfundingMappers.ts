import { uiAvatarFromSeed } from '../utils/avatarFallback';
import { toAbsoluteMediaUrl } from '../utils/absoluteMediaUrl';
import type { CrowdfundingMilestone, CrowdfundingProject, Reward } from './crowdfunding';

/** Payload GET /api/crowdfunding ou détail. */
export function mapApiCampaignToCrowdfundingProject(p: any): CrowdfundingProject {
  const goal = Number(p.goal_amount ?? p.goalAmount ?? p.goal ?? 0);
  const raised = Number(p.current_amount ?? p.raisedAmount ?? p.raised ?? 0);
  const end = p.end_date ?? p.endDate;
  const endMs = end ? new Date(end).getTime() : Date.now();
  const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86400000));
  const desc = String(p.description ?? '');
  const shortDescription = desc.length > 220 ? `${desc.slice(0, 217)}…` : desc;
  const cover =
    p.cover_image ||
    p.coverImage ||
    p.image_url ||
    p.imageUrl ||
    (Array.isArray(p.images) && p.images[0]) ||
    '';
  const abs = cover ? toAbsoluteMediaUrl(String(cover).trim()) : '';
  const creatorName = p.creator?.name || p.creator_name || 'Créateur';
  const creatorId = p.creator?.id || p.creator_id || 'creator';
  const creatorAvatar = p.creator?.avatar
    ? toAbsoluteMediaUrl(String(p.creator.avatar).trim())
    : p.creator_avatar
      ? toAbsoluteMediaUrl(String(p.creator_avatar).trim())
      : uiAvatarFromSeed(creatorName);

  const rawRewards = Array.isArray(p.rewards) ? p.rewards : [];
  const rewards: Reward[] = rawRewards.map((r: Record<string, unknown>, i: number) => ({
    id: String(r.id ?? `r${i}`),
    title: String(r.title ?? 'Récompense'),
    description: String(r.description ?? ''),
    amount: Math.max(0, Number(r.amount) || 0),
    claimed: Math.max(0, Number(r.claimed) || 0),
    limit: Math.max(1, Number(r.limit) || 999),
    deliveryDate: String(r.deliveryDate ?? r.delivery_date ?? ''),
    icon: String(r.icon ?? 'gift'),
  }));

  return {
    id: String(p.id),
    title: String(p.title ?? ''),
    description: desc,
    shortDescription: shortDescription || '—',
    images: abs ? [abs] : [],
    goal,
    raised,
    backers: Math.max(0, Number(p.backers_count ?? p.backers ?? 0)),
    daysLeft,
    category: String(p.category || 'general'),
    creator: {
      id: String(creatorId),
      name: creatorName,
      avatar: creatorAvatar,
      location: p.creator?.location || 'Bamako, Mali',
      isVerified: Boolean(p.creator?.isVerified ?? p.kyc_verified),
      projectsCount: Number(p.creator?.projectsCount) || 1,
      successRate: Number(p.creator?.successRate) || 100,
    },
    isVerified: Boolean(p.kyc_verified),
    isSponsored: false,
    rewards,
    createdAt: String(p.created_at ?? new Date().toISOString()),
    updates: Math.max(0, Number(p.updates_count ?? p.updates ?? 0)),
    comments: Math.max(0, Number(p.comments_count ?? p.comments ?? 0)),
    status: p.status != null ? String(p.status) : undefined,
    milestones: Array.isArray(p.milestones)
      ? (p.milestones as CrowdfundingMilestone[]).map((m) => ({
          id: String((m as CrowdfundingMilestone).id ?? ''),
          label: String((m as CrowdfundingMilestone).label ?? ''),
          amount_target: Number((m as CrowdfundingMilestone).amount_target) || 0,
          amount_released: Number((m as CrowdfundingMilestone).amount_released) || 0,
          status: String((m as CrowdfundingMilestone).status ?? ''),
          released_at: (m as CrowdfundingMilestone).released_at,
        }))
      : undefined,
  };
}
