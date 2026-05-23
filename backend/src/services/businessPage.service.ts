import prisma from '../config/database.js';

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export async function createOrUpdateBusinessPage(userId: string, data: {
  name: string;
  slug?: string;
  description?: string;
  avatar_url?: string;
  cover_url?: string;
  website?: string;
  phone?: string;
}) {
  const slug = data.slug?.trim() || slugify(data.name);
  const existing = await prisma.businessPage.findUnique({ where: { user_id: userId } });
  const payload = {
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || null,
    avatar_url: data.avatar_url?.trim() || null,
    cover_url: data.cover_url?.trim() || null,
    website: data.website?.trim() || null,
    phone: data.phone?.trim() || null,
  };
  if (existing) {
    return prisma.businessPage.update({
      where: { user_id: userId },
      data: { ...payload, updated_at: new Date() },
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
  }
  return prisma.businessPage.create({
    data: { user_id: userId, ...payload },
    include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
  });
}

export async function getBySlug(slug: string) {
  return prisma.businessPage.findUnique({
    where: { slug },
    include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
  });
}

export async function getByUserId(userId: string) {
  return prisma.businessPage.findUnique({
    where: { user_id: userId },
    include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
  });
}
