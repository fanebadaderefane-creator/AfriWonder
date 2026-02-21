/**
 * Prestataires Formations (formateurs) — approbation admin AfriWonder
 */
import prisma from '../config/database.js';

export class CourseProviderService {
  async register(userId: string, data: { full_name: string; email: string; phone: string; bio?: string; domains?: string; experience?: string }) {
    const existing = await prisma.courseProvider.findUnique({ where: { user_id: userId } });
    if (existing) {
      if (existing.status === 'approved') throw new Error('Vous êtes déjà formateur approuvé');
      if (existing.status === 'pending') throw new Error('Votre demande est déjà en cours d\'examen');
      // rejected: allow re-apply by updating
    }
    const payload = {
      user_id: userId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      bio: data.bio ?? null,
      domains: data.domains ?? null,
      experience: data.experience ?? null,
      status: 'pending' as const,
      rejected_reason: null,
    };
    if (existing) {
      return prisma.courseProvider.update({
        where: { id: existing.id },
        data: payload,
      });
    }
    return prisma.courseProvider.create({ data: payload });
  }

  async getByUserId(userId: string) {
    return prisma.courseProvider.findUnique({
      where: { user_id: userId },
    });
  }

  async getPending() {
    return prisma.courseProvider.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, full_name: true, email: true, profile_image: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async approve(id: string) {
    const provider = await prisma.courseProvider.findUnique({ where: { id } });
    if (!provider) throw new Error('Prestataire introuvable');
    if (provider.status !== 'pending') throw new Error('Demande déjà traitée');
    return prisma.courseProvider.update({
      where: { id },
      data: { status: 'approved', rejected_reason: null },
    });
  }

  async reject(id: string, reason?: string) {
    const provider = await prisma.courseProvider.findUnique({ where: { id } });
    if (!provider) throw new Error('Prestataire introuvable');
    if (provider.status !== 'pending') throw new Error('Demande déjà traitée');
    return prisma.courseProvider.update({
      where: { id },
      data: { status: 'rejected', rejected_reason: reason ?? null },
    });
  }

  /** Ids des user_id qui sont formateurs approuvés (pour filtrer la liste des cours) */
  async getApprovedUserIds(): Promise<string[]> {
    const rows = await prisma.courseProvider.findMany({
      where: { status: 'approved' },
      select: { user_id: true },
    });
    return rows.map((r) => r.user_id);
  }
}

const courseProviderService = new CourseProviderService();
export default courseProviderService;
