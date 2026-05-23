/**
 * CPO 11.36 — A/B testing (admin) : expériences et affectation utilisateur
 */
import prisma from '../config/database.js';

class ExperimentService {
  async getVariantForUser(experimentKey: string, userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const experiment = await prisma.experiment.findUnique({
      where: { key: experimentKey, is_active: true },
      include: { variants: true },
    });
    if (!experiment || experiment.variants.length === 0) return null;
    const existing = await prisma.userExperimentAssignment.findUnique({
      where: { user_id_experiment_id: { user_id: userId, experiment_id: experiment.id } },
    });
    if (existing) return existing.variant_key;
    const variant = this.pickVariant(experiment.variants);
    if (!variant) return null;
    await prisma.userExperimentAssignment.upsert({
      where: { user_id_experiment_id: { user_id: userId, experiment_id: experiment.id } },
      create: { user_id: userId, experiment_id: experiment.id, variant_key: variant.variant_key },
      update: {},
    });
    return variant.variant_key;
  }

  private pickVariant(variants: { variant_key: string; traffic_pct: number }[]): { variant_key: string; traffic_pct: number } | null {
    const total = variants.reduce((s, v) => s + v.traffic_pct, 0);
    if (total <= 0) return variants[0] || null;
    let r = Math.random() * total;
    for (const v of variants) {
      r -= v.traffic_pct;
      if (r <= 0) return v;
    }
    return variants[variants.length - 1] || null;
  }

  async getAssignment(experimentKey: string, userId: string) {
    const experiment = await prisma.experiment.findUnique({
      where: { key: experimentKey, is_active: true },
      include: { variants: true },
    });
    if (!experiment) return null;
    const assignment = await prisma.userExperimentAssignment.findUnique({
      where: { user_id_experiment_id: { user_id: userId, experiment_id: experiment.id } },
    });
    const variantKey = assignment?.variant_key ?? this.pickVariant(experiment.variants)?.variant_key ?? null;
    const variant = variantKey ? experiment.variants.find((v) => v.variant_key === variantKey) : null;
    return variantKey ? { experiment_key: experimentKey, variant_key: variantKey, config: variant?.config ?? null } : null;
  }

  async listAdmin() {
    return prisma.experiment.findMany({
      include: { variants: true, _count: { select: { assignments: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async createAdmin(data: { key: string; name: string; description?: string; variants: { variant_key: string; traffic_pct: number; config?: object }[] }) {
    if (!data.key?.trim() || !data.name?.trim()) {
      const err: any = new Error('key et name requis');
      err.statusCode = 400;
      throw err;
    }
    const totalPct = (data.variants || []).reduce((s, v) => s + (v.traffic_pct || 0), 0);
    if (totalPct !== 100) {
      const err: any = new Error('La somme des traffic_pct doit être 100');
      err.statusCode = 400;
      throw err;
    }
    return prisma.experiment.create({
      data: {
        key: data.key.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        is_active: true,
        variants: {
          create: (data.variants || []).map((v) => ({
            variant_key: v.variant_key,
            traffic_pct: v.traffic_pct,
            config: v.config ?? undefined,
          })),
        },
      },
      include: { variants: true },
    });
  }
}

const experimentService = new ExperimentService();
export default experimentService;
