import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

type MainGoal = 'earn_money' | 'learn' | 'find_job' | 'entrepreneur';

type JourneyInput = {
  goal?: MainGoal;
  skills?: string[];
  level?: 'beginner' | 'intermediate' | 'advanced';
  interests?: string[];
  location?: string;
  availability?: string;
  financialGoal?: number;
};

type MatchingOpportunity = {
  id: string;
  module: 'jobs' | 'courses' | 'marketplace' | 'services' | 'microcredit';
  title: string;
  description: string;
  score: number;
  reason: string[];
  payload: Record<string, unknown>;
};

type BehaviorProfile = {
  moduleAffinity: Record<string, number>;
  totalActions: number;
  recentActions7d: number;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return value.split(',').map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

function goalFromText(value: string): MainGoal {
  const normalized = normalizeText(value);
  if (normalized.includes('learn') || normalized.includes('appren')) return 'learn';
  if (normalized.includes('job') || normalized.includes('emploi') || normalized.includes('work')) return 'find_job';
  if (normalized.includes('entre') || normalized.includes('business')) return 'entrepreneur';
  return 'earn_money';
}

function buildJourney(goal: MainGoal) {
  const shared = [
    { id: 'onboarding', title: 'Completer votre profil', module: 'profile', impact: 'high' },
    { id: 'first_action', title: 'Realiser votre premiere action utile', module: 'matching', impact: 'high' },
  ];

  if (goal === 'learn') {
    return [
      ...shared,
      { id: 'course_start', title: 'Demarrer une formation', module: 'courses', impact: 'high' },
      { id: 'practice_market', title: 'Publier votre competence', module: 'services', impact: 'medium' },
      { id: 'first_revenue', title: 'Generer votre premier revenu', module: 'wallet', impact: 'high' },
    ];
  }

  if (goal === 'find_job') {
    return [
      ...shared,
      { id: 'cv_ready', title: 'Completer votre profil candidat', module: 'jobs', impact: 'high' },
      { id: 'apply_jobs', title: 'Postuler a des offres ciblees', module: 'jobs', impact: 'high' },
      { id: 'track_interviews', title: 'Suivre vos candidatures', module: 'jobs', impact: 'medium' },
    ];
  }

  if (goal === 'entrepreneur') {
    return [
      ...shared,
      { id: 'offer_setup', title: 'Publier une offre/produit', module: 'marketplace', impact: 'high' },
      { id: 'wallet_activation', title: 'Activer votre wallet', module: 'wallet', impact: 'high' },
      { id: 'growth_loop', title: 'Suivre vos revenus et reinvestir', module: 'analytics', impact: 'high' },
    ];
  }

  return [
    ...shared,
    { id: 'income_path', title: 'Choisir un canal de revenu', module: 'matching', impact: 'high' },
    { id: 'first_task', title: 'Executer une mission concrete', module: 'jobs', impact: 'high' },
    { id: 'stability', title: 'Stabiliser vos revenus', module: 'wallet', impact: 'high' },
  ];
}

function scoreByGoal(goal: MainGoal, moduleName: MatchingOpportunity['module']): number {
  const matrix: Record<MainGoal, Record<MatchingOpportunity['module'], number>> = {
    earn_money: { jobs: 85, courses: 60, marketplace: 80, services: 90, microcredit: 70 },
    learn: { jobs: 65, courses: 95, marketplace: 55, services: 70, microcredit: 50 },
    find_job: { jobs: 95, courses: 70, marketplace: 45, services: 60, microcredit: 45 },
    entrepreneur: { jobs: 50, courses: 70, marketplace: 95, services: 88, microcredit: 90 },
  };
  return matrix[goal][moduleName];
}

function pickFirstString(values: unknown[]): string {
  for (const value of values) {
    const parsed = String(value || '').trim();
    if (parsed) return parsed;
  }
  return '';
}

function calcJourneyCompletion(profile: {
  goal?: string;
  level?: string;
  location?: string;
  availability?: string;
  financialGoal?: number | null;
  skills?: string[];
  interests?: string[];
}) {
  const checks = [
    Boolean(profile.goal),
    Boolean(profile.level),
    Boolean(profile.location),
    Boolean(profile.availability),
    (profile.skills || []).length > 0,
    (profile.interests || []).length > 0,
  ];
  let score = 10 + checks.filter(Boolean).length * 12;
  if ((profile.skills || []).length >= 3) score += 10;
  if ((profile.financialGoal || 0) > 0) score += 8;
  return Math.min(100, score);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeRate(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function trendPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

class MatchingEngineService {
  private async getWindowMetrics(userId: string, startDate: Date, endDate: Date) {
    const whereAnalytics = {
      user_id: userId,
      date: { gte: startDate, lt: endDate },
    };

    const [
      onboardingSaved,
      journeyPreview,
      matchingRequests,
      opportunityActions,
      matchingAggregate,
      completedTransactionsCount,
      completedTransactionsAmount,
      activeEvents,
    ] = await Promise.all([
      prisma.analytics.count({
        where: { ...whereAnalytics, entity_type: 'matching', metric_type: 'onboarding_saved' },
      }),
      prisma.analytics.count({
        where: { ...whereAnalytics, entity_type: 'matching', metric_type: 'journey_preview' },
      }),
      prisma.analytics.count({
        where: { ...whereAnalytics, entity_type: 'matching', metric_type: 'matching_request' },
      }),
      prisma.analytics.count({
        where: { ...whereAnalytics, entity_type: 'matching', metric_type: 'opportunity_action' },
      }),
      prisma.analytics.aggregate({
        where: { ...whereAnalytics, entity_type: 'matching', metric_type: 'matching_request' },
        _sum: { metric_value: true },
      }),
      prisma.transaction.count({
        where: {
          user_id: userId,
          status: 'completed',
          created_at: { gte: startDate, lt: endDate },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: userId,
          status: 'completed',
          created_at: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.analytics.findMany({
        where: whereAnalytics,
        select: { date: true },
        take: 3000,
      }),
    ]);

    const opportunitiesServed = Math.max(0, Math.round(matchingAggregate._sum.metric_value || 0));
    const revenuesGenerated = Math.round(completedTransactionsAmount._sum.amount || 0);
    const activeDays = new Set(activeEvents.map((e) => new Date(e.date).toISOString().slice(0, 10))).size;

    return {
      onboardingSaved,
      journeyPreview,
      matchingRequests,
      opportunityActions,
      opportunitiesServed,
      completedTransactionsCount,
      revenuesGenerated,
      activeDays,
      activationRate: onboardingSaved > 0 ? 100 : 0,
      engagement: matchingRequests + opportunityActions,
      matchingSuccessRate: safeRate(opportunityActions, Math.max(1, opportunitiesServed)),
      conversionRevenueRate: safeRate(completedTransactionsCount, Math.max(1, opportunityActions)),
    };
  }

  private async getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    const actionEvents = await prisma.analytics.findMany({
      where: {
        user_id: userId,
        entity_type: 'matching',
        metric_type: 'opportunity_action',
      },
      orderBy: { date: 'desc' },
      take: 300,
      select: { metadata: true, date: true },
    }).catch(() => []);

    const moduleAffinity: Record<string, number> = {};
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let recentActions7d = 0;

    for (const evt of actionEvents) {
      const moduleName = String((evt.metadata as any)?.module || '').trim().toLowerCase();
      if (moduleName) moduleAffinity[moduleName] = (moduleAffinity[moduleName] || 0) + 1;
      if (evt.date && new Date(evt.date).getTime() >= sevenDaysAgo) recentActions7d += 1;
    }

    return {
      moduleAffinity,
      totalActions: actionEvents.length,
      recentActions7d,
    };
  }

  private applyBehaviorBoost(opportunities: MatchingOpportunity[], behavior: BehaviorProfile) {
    const maxAffinity = Math.max(1, ...Object.values(behavior.moduleAffinity));
    return opportunities
      .map((op) => {
        const affinity = behavior.moduleAffinity[op.module] || 0;
        const affinityBoost = clamp((affinity / maxAffinity) * 12, 0, 12);
        const activityBoost = behavior.recentActions7d >= 5 ? 4 : behavior.recentActions7d >= 2 ? 2 : 0;
        const boostedScore = op.score + affinityBoost + activityBoost;
        const reason = [...op.reason];
        if (affinityBoost >= 6) reason.push('Affinite comportementale');
        if (activityBoost > 0) reason.push('Activite recente');
        return { ...op, score: boostedScore, reason };
      })
      .sort((a, b) => b.score - a.score);
  }

  async saveOnboardingProfile(userId: string, input: JourneyInput = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidate_profile: true },
    });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const savedSkills = toStringArray(user.candidate_profile?.skills);
    const savedInterests = toStringArray(
      await prisma.analytics
        .findFirst({
          where: {
            user_id: userId,
            entity_type: 'matching',
            metric_type: 'onboarding_saved',
          },
          orderBy: { date: 'desc' },
          select: { metadata: true },
        })
        .then((event) => (event?.metadata as any)?.interests)
        .catch(() => [])
    );

    const skills = [...new Set([...(input.skills || []), ...savedSkills])].slice(0, 20);
    const interests = [...new Set([...(input.interests || []), ...savedInterests])].slice(0, 20);
    const goal = input.goal || goalFromText(user.bio || '');
    const level = input.level || 'beginner';
    const location = pickFirstString([input.location, user.location]);
    const availability = pickFirstString([input.availability, user.candidate_profile?.availability, 'immediate']);
    const financialGoal = input.financialGoal && input.financialGoal > 0 ? input.financialGoal : null;

    await prisma.candidateProfile.upsert({
      where: { user_id: userId },
      update: {
        skills: skills as any,
        availability,
      },
      create: {
        user_id: userId,
        skills: skills as any,
        availability,
      },
    });

    if (location && location !== user.location) {
      await prisma.user.update({
        where: { id: userId },
        data: { location },
      });
    }

    await prisma.analytics.create({
      data: {
        user_id: userId,
        entity_type: 'matching',
        entity_id: userId,
        metric_type: 'onboarding_saved',
        metric_value: 1,
        metadata: {
          goal,
          level,
          location,
          availability,
          skills,
          interests,
          financialGoal,
        } as any,
      },
    }).catch(() => {});

    return {
      goal,
      level,
      location,
      availability,
      financialGoal,
      skills,
      interests,
      completionPercent: calcJourneyCompletion({
        goal,
        level,
        location,
        availability,
        financialGoal,
        skills,
        interests,
      }),
    };
  }

  async getSavedOnboardingProfile(userId: string) {
    const [user, event] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          candidate_profile: true,
          user_level: true,
        },
      }),
      prisma.analytics.findFirst({
        where: {
          user_id: userId,
          entity_type: 'matching',
          metric_type: 'onboarding_saved',
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const metadata = (event?.metadata || {}) as any;
    const skills = toStringArray(metadata.skills);
    const interests = toStringArray(metadata.interests);
    const goal = (metadata.goal as MainGoal) || goalFromText(user.bio || '');
    const level = (metadata.level as JourneyInput['level']) || (user.user_level?.level && user.user_level.level >= 5 ? 'intermediate' : 'beginner');
    const location = pickFirstString([metadata.location, user.location]);
    const availability = pickFirstString([metadata.availability, user.candidate_profile?.availability, 'immediate']);
    const financialGoal = Number(metadata.financialGoal || 0) || null;

    return {
      goal,
      level,
      location,
      availability,
      financialGoal,
      skills: skills.length > 0 ? skills : toStringArray(user.candidate_profile?.skills),
      interests,
      completionPercent: calcJourneyCompletion({
        goal,
        level,
        location,
        availability,
        financialGoal,
        skills,
        interests,
      }),
      updatedAt: event?.date || user.updated_at,
    };
  }

  async buildUserJourney(userId: string, input: JourneyInput = {}) {
    const [user, savedProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          candidate_profile: true,
          user_level: true,
        },
      }),
      this.getSavedOnboardingProfile(userId).catch(() => null),
    ]);

    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const profileSkills = toStringArray(user.candidate_profile?.skills);
    const savedSkills = savedProfile?.skills || [];
    const mergedSkills = [...new Set([...(input.skills || []), ...savedSkills, ...profileSkills])].slice(0, 20);
    const level =
      input.level ||
      savedProfile?.level ||
      (user.user_level?.level && user.user_level.level >= 5 ? 'intermediate' : 'beginner');
    const goal = input.goal || savedProfile?.goal || goalFromText(user.bio || '');
    const location = pickFirstString([input.location, savedProfile?.location, user.location]);
    const interests = [...new Set([...(input.interests || []), ...(savedProfile?.interests || [])])].slice(0, 20);
    const availability = pickFirstString([input.availability, savedProfile?.availability, user.candidate_profile?.availability]);
    const financialGoal =
      input.financialGoal && input.financialGoal > 0
        ? input.financialGoal
        : (savedProfile?.financialGoal || null);

    const journey = buildJourney(goal);
    const completion = calcJourneyCompletion({
      goal,
      skills: mergedSkills,
      level,
      location,
      interests,
      availability,
      financialGoal,
    });

    await prisma.analytics.create({
      data: {
        user_id: userId,
        entity_type: 'matching',
        entity_id: userId,
        metric_type: 'journey_preview',
        metric_value: 1,
        metadata: {
        goal,
        skillsCount: mergedSkills.length,
        level,
        location,
        interestsCount: interests.length,
      } as any,
    },
  }).catch(() => {});

    return {
      profile: {
        userId: user.id,
        goal,
        skills: mergedSkills,
        level,
        interests,
        availability: availability || null,
        location,
        financialGoal,
      },
      journey,
      progress: {
        completionPercent: completion,
        nextBestAction: journey[1]?.title || journey[0]?.title || 'Completer votre profil',
      },
    };
  }

  async getOpportunitiesForUser(userId: string, input: JourneyInput = {}, limit = 20) {
    const journeyData = await this.buildUserJourney(userId, input);
    const { goal, skills, location } = journeyData.profile;
    const normalizedSkills = skills.map((s: string) => normalizeText(s));
    const normalizedLocation = normalizeText(location);
    const maxItems = Math.min(Math.max(limit, 5), 50);

    const [jobs, courses, products, providers, loans] = await Promise.all([
      prisma.job.findMany({
        where: { status: 'open' },
        orderBy: [{ is_urgent: 'desc' }, { is_premium: 'desc' }, { created_at: 'desc' }],
        take: 30,
      }),
      prisma.course.findMany({
        where: { is_published: true },
        orderBy: [{ is_featured: 'desc' }, { rating: 'desc' }, { created_at: 'desc' }],
        take: 30,
      }),
      prisma.product.findMany({
        where: { status: 'active' },
        orderBy: [{ created_at: 'desc' }],
        take: 25,
      }),
      prisma.serviceProvider.findMany({
        where: { status: { in: ['active', 'pending'] } },
        orderBy: [{ is_verified: 'desc' }, { average_rating: 'desc' }, { created_at: 'desc' }],
        take: 25,
      }),
      prisma.loanRequest.findMany({
        where: { status: 'active' },
        orderBy: [{ created_at: 'desc' }],
        take: 20,
      }),
    ]);

    const opportunities: MatchingOpportunity[] = [];

    for (const job of jobs) {
      const reason: string[] = ['Job ouvert'];
      let score = scoreByGoal(goal, 'jobs');
      const haystack = `${job.title} ${job.description} ${job.category || ''}`.toLowerCase();
      if (normalizedSkills.some((s) => haystack.includes(s))) {
        score += 10;
        reason.push('Correspondance competences');
      }
      if (normalizedLocation && normalizeText(job.location).includes(normalizedLocation)) {
        score += 8;
        reason.push('Proche de votre localisation');
      }
      opportunities.push({
        id: `job:${job.id}`,
        module: 'jobs',
        title: job.title,
        description: job.description.slice(0, 140),
        score,
        reason,
        payload: { id: job.id, category: job.category, location: job.location, type: job.job_type },
      });
    }

    for (const course of courses) {
      const reason: string[] = ['Formation disponible'];
      let score = scoreByGoal(goal, 'courses');
      if (course.level && normalizeText(course.level) === normalizeText(journeyData.profile.level)) {
        score += 7;
        reason.push('Niveau adapte');
      }
      if (normalizedSkills.some((s) => normalizeText(course.title + ' ' + (course.description || '')).includes(s))) {
        score += 8;
        reason.push('Alignement competences');
      }
      opportunities.push({
        id: `course:${course.id}`,
        module: 'courses',
        title: course.title,
        description: (course.description || '').slice(0, 140),
        score,
        reason,
        payload: { id: course.id, level: course.level, category: course.category, price: course.price },
      });
    }

    for (const product of products) {
      const reason: string[] = ['Produit monetable'];
      let score = scoreByGoal(goal, 'marketplace');
      if (normalizedSkills.some((s) => normalizeText(product.name + ' ' + (product.description || '')).includes(s))) {
        score += 6;
        reason.push('Lie a vos centres d interet');
      }
      opportunities.push({
        id: `product:${product.id}`,
        module: 'marketplace',
        title: product.name,
        description: (product.description || '').slice(0, 140),
        score,
        reason,
        payload: { id: product.id, price: product.price, category: product.category, stock: product.stock },
      });
    }

    for (const provider of providers) {
      const reason: string[] = ['Service local disponible'];
      let score = scoreByGoal(goal, 'services');
      if (provider.is_verified) {
        score += 6;
        reason.push('Prestataire verifie');
      }
      if (normalizedLocation && normalizeText(provider.city).includes(normalizedLocation)) {
        score += 8;
        reason.push('Ville correspondante');
      }
      if (provider.average_rating >= 4) {
        score += 4;
        reason.push('Bonne reputation');
      }
      opportunities.push({
        id: `provider:${provider.id}`,
        module: 'services',
        title: provider.bio?.slice(0, 60) || 'Prestataire recommande',
        description: `Categories: ${(provider.service_categories || []).slice(0, 3).join(', ') || 'General'}`,
        score,
        reason,
        payload: { id: provider.id, city: provider.city, categories: provider.service_categories, rating: provider.average_rating },
      });
    }

    for (const loan of loans) {
      const reason: string[] = ['Financement actif'];
      let score = scoreByGoal(goal, 'microcredit');
      if (goal === 'entrepreneur' || goal === 'earn_money') {
        score += 8;
        reason.push('Utile pour lancer/accelerer une activite');
      }
      opportunities.push({
        id: `loan:${loan.id}`,
        module: 'microcredit',
        title: `Demande ${loan.purpose}`,
        description: `Montant: ${loan.amount_requested.toLocaleString('fr-FR')} XOF`,
        score,
        reason,
        payload: { id: loan.id, amount: loan.amount_requested, risk: loan.risk_level, deadline: loan.deadline },
      });
    }

    const behavior = await this.getBehaviorProfile(userId);
    const ranked = this.applyBehaviorBoost(opportunities, behavior);
    const sliced = ranked.slice(0, maxItems);

    await prisma.analytics.create({
      data: {
        user_id: userId,
        entity_type: 'matching',
        entity_id: userId,
        metric_type: 'matching_request',
        metric_value: sliced.length,
        metadata: { goal, returned: sliced.length } as any,
      },
    }).catch(() => {});

    return {
      goal,
      count: sliced.length,
      behavior: {
        totalActions: behavior.totalActions,
        recentActions7d: behavior.recentActions7d,
        topModule: Object.entries(behavior.moduleAffinity).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      },
      opportunities: sliced,
      sections: {
        opportunitiesForYou: sliced.slice(0, 8),
        quickWins: sliced.filter((o) => o.score >= 90).slice(0, 5),
      },
    };
  }

  async trackOpportunityAction(userId: string, opportunityId: string, moduleName: string, action = 'open') {
    await prisma.analytics.create({
      data: {
        user_id: userId,
        entity_type: 'matching',
        entity_id: opportunityId,
        metric_type: 'opportunity_action',
        metric_value: 1,
        metadata: {
          module: moduleName,
          action,
        } as any,
      },
    }).catch(() => {});

    return { tracked: true };
  }

  getInterconnections() {
    return [
      {
        source: 'education',
        target: 'jobs',
        rule: 'formation_terminee -> opportunites emploi priorisees',
      },
      {
        source: 'marketplace',
        target: 'wallet',
        rule: 'vente_realisee -> credit wallet en temps reel',
      },
      {
        source: 'profile',
        target: 'matching',
        rule: 'maj profil -> recalcul opportunites',
      },
      {
        source: 'content',
        target: 'monetization',
        rule: 'engagement contenu -> eligibility monetisation',
      },
    ];
  }

  async getJourneyDashboard(userId: string) {
    const [user, matchingEvents, journeyEvents, opportunityActions, totalOpportunities, completedTransactions, completedTransactionsCount, savedOnboarding] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { created_at: true },
      }),
      prisma.analytics.count({ where: { user_id: userId, entity_type: 'matching', metric_type: 'matching_request' } }),
      prisma.analytics.count({ where: { user_id: userId, entity_type: 'matching', metric_type: 'journey_preview' } }),
      prisma.analytics.count({ where: { user_id: userId, entity_type: 'matching', metric_type: 'opportunity_action' } }),
      prisma.analytics.aggregate({
        where: { user_id: userId, entity_type: 'matching', metric_type: 'matching_request' },
        _sum: { metric_value: true },
      }),
      prisma.transaction.aggregate({
        where: { user_id: userId, status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: { user_id: userId, status: 'completed' },
      }),
      this.getSavedOnboardingProfile(userId).catch(() => null),
    ]);

    const opportunitiesAvailable = Math.max(0, Math.round(totalOpportunities._sum.metric_value || 0));
    const completionPercent = savedOnboarding?.completionPercent || (journeyEvents > 0 ? 55 : 20);
    const actionBase = Math.max(1, opportunityActions);
    const conversionRevenueRate = Math.min(100, Math.round((completedTransactionsCount / actionBase) * 100));
    const matchingSuccessRate = opportunitiesAvailable > 0
      ? Math.min(100, Math.round((opportunityActions / opportunitiesAvailable) * 100))
      : (matchingEvents > 0 ? Math.min(100, 50 + matchingEvents * 2) : 0);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : now;

    let retentionD7 = 0;
    let retentionD30 = 0;
    if (user?.created_at) {
      const ageDays = Math.floor((now - createdAt) / day);
      if (ageDays >= 7) {
        const d7WindowStart = new Date(createdAt + 7 * day);
        const d7WindowEnd = new Date(createdAt + 14 * day);
        const d7Activity = await prisma.analytics.count({
          where: { user_id: userId, date: { gte: d7WindowStart, lt: d7WindowEnd } },
        });
        retentionD7 = d7Activity > 0 ? 100 : 0;
      }
      if (ageDays >= 30) {
        const d30WindowStart = new Date(createdAt + 30 * day);
        const d30WindowEnd = new Date(createdAt + 37 * day);
        const d30Activity = await prisma.analytics.count({
          where: { user_id: userId, date: { gte: d30WindowStart, lt: d30WindowEnd } },
        });
        retentionD30 = d30Activity > 0 ? 100 : 0;
      }
    }

    const recommendedActions = [
      completionPercent < 70 ? 'Completer le profil onboarding' : null,
      matchingEvents < 3 ? 'Explorer au moins 3 opportunites ciblees' : null,
      opportunityActions < 2 ? 'Ouvrir et executer une opportunite a fort score' : null,
      conversionRevenueRate < 20 ? 'Activer le wallet et finaliser un paiement test' : null,
    ].filter(Boolean) as string[];

    return {
      kpi: {
        activation: journeyEvents > 0 ? 1 : 0,
        engagement: matchingEvents,
        matchingSuccessRate,
        progressionPercent: completionPercent,
        opportunitiesAvailable,
        revenuesGenerated: Math.round(completedTransactions._sum.amount || 0),
        conversionRevenueRate,
        retentionD7,
        retentionD30,
      },
      recommendedActions,
      recommendation: matchingEvents < 3
        ? 'Completez le parcours et appliquez les opportunites recommandees'
        : 'Continuez les actions a fort impact pour accelerer vos revenus',
    };
  }

  async getKpiSummary(userId: string, windowDays = 30) {
    const days = Math.min(Math.max(Number(windowDays) || 30, 7), 90);
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
    const previousEnd = currentStart;

    const [dashboard, current, previous] = await Promise.all([
      this.getJourneyDashboard(userId),
      this.getWindowMetrics(userId, currentStart, now),
      this.getWindowMetrics(userId, previousStart, previousEnd),
    ]);

    const funnelSteps = [
      { id: 'onboarding_saved', label: 'Onboarding valide', value: current.onboardingSaved },
      { id: 'journey_preview', label: 'Parcours genere', value: current.journeyPreview },
      { id: 'opportunities_served', label: 'Opportunites servies', value: current.opportunitiesServed },
      { id: 'opportunities_opened', label: 'Opportunites ouvertes', value: current.opportunityActions },
      { id: 'transactions_completed', label: 'Transactions completees', value: current.completedTransactionsCount },
    ];
    const funnelBase = Math.max(1, funnelSteps[0]?.value || 1);
    const funnel = funnelSteps.map((step) => ({
      ...step,
      conversionFromStart: safeRate(step.value, funnelBase),
    }));

    const activityConsistency = safeRate(current.activeDays, days);

    await prisma.analytics.create({
      data: {
        user_id: userId,
        entity_type: 'matching',
        entity_id: userId,
        metric_type: 'kpi_summary_view',
        metric_value: 1,
        metadata: { windowDays: days } as any,
      },
    }).catch(() => {});

    return {
      window: {
        days,
        from: currentStart,
        to: now,
      },
      current: {
        ...current,
        progressionPercent: dashboard.kpi.progressionPercent,
        retentionD7: dashboard.kpi.retentionD7,
        retentionD30: dashboard.kpi.retentionD30,
        activityConsistency,
      },
      previous: {
        ...previous,
      },
      trends: {
        activationRate: trendPercent(current.activationRate, previous.activationRate),
        engagement: trendPercent(current.engagement, previous.engagement),
        matchingSuccessRate: trendPercent(current.matchingSuccessRate, previous.matchingSuccessRate),
        conversionRevenueRate: trendPercent(current.conversionRevenueRate, previous.conversionRevenueRate),
        revenuesGenerated: trendPercent(current.revenuesGenerated, previous.revenuesGenerated),
        activityConsistency: trendPercent(activityConsistency, safeRate(previous.activeDays, days)),
      },
      funnel,
      recommendedActions: dashboard.recommendedActions,
    };
  }

  async getCoachSuggestions(userId: string) {
    const [dashboard, onboarding, opportunities] = await Promise.all([
      this.getJourneyDashboard(userId),
      this.getSavedOnboardingProfile(userId).catch(() => null),
      this.getOpportunitiesForUser(userId, {}, 8),
    ]);

    const tips: string[] = [];
    const kpi = dashboard.kpi;
    const goal = onboarding?.goal || 'earn_money';

    if ((kpi.progressionPercent || 0) < 70) {
      tips.push('Complete ton onboarding pour ameliorer la precision des recommandations.');
    }
    if ((kpi.conversionRevenueRate || 0) < 20) {
      tips.push('Active un paiement rapide pour transformer tes opportunites en revenu concret.');
    }
    if ((kpi.matchingSuccessRate || 0) < 40) {
      tips.push('Ouvre en priorite les opportunites avec score eleve et proche de ta localisation.');
    }
    if ((kpi.retentionD7 || 0) === 0) {
      tips.push('Planifie 1 action par jour pendant 7 jours pour stabiliser ta progression.');
    }
    if (tips.length === 0) {
      tips.push('Continue ce rythme: ton profil est bien calibre et les opportunites restent pertinentes.');
    }

    const coachMode =
      goal === 'learn' ? 'coach_formation'
        : goal === 'find_job' ? 'coach_emploi'
          : goal === 'entrepreneur' ? 'coach_business'
            : 'coach_revenu';

    return {
      coachMode,
      summary: dashboard.recommendation,
      topActions: (dashboard.recommendedActions || []).slice(0, 3),
      tips: tips.slice(0, 4),
      highlightedOpportunities: (opportunities.opportunities || []).slice(0, 3).map((op) => ({
        id: op.id,
        title: op.title,
        module: op.module,
        score: Math.round(op.score),
      })),
    };
  }

  async getCoachHistory(userId: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await prisma.analytics.findMany({
      where: {
        user_id: userId,
        entity_type: 'matching',
        metric_type: 'coach_chat',
      },
      orderBy: { date: 'desc' },
      take,
      select: { id: true, date: true, metadata: true },
    });

    return rows
      .map((row) => ({
        id: row.id,
        role: String((row.metadata as any)?.role || 'assistant'),
        text: String((row.metadata as any)?.text || ''),
        createdAt: row.date,
      }))
      .filter((m) => m.text.trim().length > 0)
      .reverse();
  }

  async chatWithCoach(userId: string, message: string) {
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      const err: any = new Error('message requis');
      err.statusCode = 400;
      throw err;
    }

    const [dashboard, trust, progression, localization, opportunities] = await Promise.all([
      this.getJourneyDashboard(userId),
      this.getTrustStatus(userId),
      this.getProgressionStatus(userId),
      this.getLocalizationStatus(userId),
      this.getOpportunitiesForUser(userId, {}, 5),
    ]);

    const lower = normalizeText(cleanMessage);
    const topOpportunity = opportunities.opportunities?.[0];

    let focus: 'revenue' | 'trust' | 'progression' | 'localization' = 'revenue';
    if (lower.includes('verification') || lower.includes('kyc') || lower.includes('secur')) {
      focus = 'trust';
    } else if (lower.includes('niveau') || lower.includes('badge') || lower.includes('progress')) {
      focus = 'progression';
    } else if (lower.includes('ville') || lower.includes('pays') || lower.includes('local')) {
      focus = 'localization';
    }

    const replyByFocus: Record<typeof focus, string> = {
      revenue: `Ton taux de conversion revenu est a ${Math.round(dashboard.kpi.conversionRevenueRate || 0)}%. Priorite: execute une opportunite a fort score puis confirme un paiement pour accelerer tes gains.`,
      trust: `Ton score de confiance est ${Math.round(trust.trustScore)}%. ${trust.checks.kycApproved ? 'KYC est valide.' : 'Finalise KYC rapidement pour debloquer plus d operations.'}`,
      progression: `Niveau ${progression.level}, progression ${progression.progressToNextLevel}%. Objectif court terme: ${progression.nextMilestones?.[0] || 'maintenir tes actions quotidiennes'}.`,
      localization: `Zone actuelle: ${localization.location || localization.country || 'non definie'}. Opportunites locales: ${localization.nearbyOpportunities.jobs} jobs et ${localization.nearbyOpportunities.providers} prestataires.`,
    };

    const opportunityHint = topOpportunity
      ? ` Opportunite recommandee maintenant: ${topOpportunity.title} (${Math.round(topOpportunity.score)} pts).`
      : '';
    const reply = `${replyByFocus[focus]}${opportunityHint}`;

    const quickActions = [
      focus === 'trust' ? 'UserVerification' : null,
      focus === 'progression' ? 'GamificationHub' : null,
      focus === 'localization' ? 'Marketplace' : null,
      'MatchingCenter',
      topOpportunity?.module === 'jobs' ? 'Jobs' : topOpportunity?.module === 'courses' ? 'Courses' : 'Marketplace',
    ].filter(Boolean) as string[];

    await prisma.analytics.createMany({
      data: [
        {
          user_id: userId,
          entity_type: 'matching',
          entity_id: userId,
          metric_type: 'coach_chat',
          metric_value: 1,
          metadata: { role: 'user', text: cleanMessage } as any,
        },
        {
          user_id: userId,
          entity_type: 'matching',
          entity_id: userId,
          metric_type: 'coach_chat',
          metric_value: 1,
          metadata: { role: 'assistant', text: reply, focus, quickActions } as any,
        },
      ],
    }).catch(() => {});

    return {
      reply,
      focus,
      quickActions,
    };
  }

  async getTrustStatus(userId: string) {
    const [user, verification, twoFA, walletSecurity, suspiciousLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          is_verified: true,
          phone_verified: true,
          account_suspended: true,
          shadow_banned: true,
        },
      }),
      prisma.userVerification.findUnique({
        where: { user_id: userId },
        select: { status: true, updated_at: true },
      }),
      prisma.user2FA.findUnique({
        where: { user_id: userId },
        select: { is_enabled: true },
      }),
      prisma.walletSecurity.findUnique({
        where: { user_id: userId },
        select: {
          pin_hash: true,
          two_fa_required_for_withdrawal: true,
          is_blocked: true,
          blocked_reason: true,
        },
      }),
      prisma.securityLog.count({
        where: {
          user_id: userId,
          status: 'suspicious',
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }).catch(() => 0),
    ]);

    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const kycApproved = verification?.status === 'approved';
    const has2FA = Boolean(twoFA?.is_enabled);
    const hasWalletPin = Boolean(walletSecurity?.pin_hash);
    const walletBlocked = Boolean(walletSecurity?.is_blocked);
    const accountFlagged = Boolean(user.account_suspended || user.shadow_banned || walletBlocked);

    let trustScore = 40;
    if (kycApproved) trustScore += 25;
    if (user.phone_verified) trustScore += 10;
    if (user.is_verified) trustScore += 10;
    if (has2FA) trustScore += 10;
    if (hasWalletPin) trustScore += 5;
    if (walletBlocked) trustScore -= 20;
    if (user.account_suspended) trustScore -= 25;
    if (user.shadow_banned) trustScore -= 15;
    trustScore -= Math.min(20, suspiciousLogs * 4);
    trustScore = Math.max(0, Math.min(100, trustScore));

    const status = accountFlagged ? 'risk' : trustScore >= 75 ? 'trusted' : trustScore >= 50 ? 'medium' : 'low';

    return {
      trustScore,
      status,
      checks: {
        kycApproved,
        phoneVerified: Boolean(user.phone_verified),
        accountVerified: Boolean(user.is_verified),
        twoFAEnabled: has2FA,
        walletPinSet: hasWalletPin,
        walletBlocked,
      },
      risk: {
        accountSuspended: Boolean(user.account_suspended),
        shadowBanned: Boolean(user.shadow_banned),
        suspiciousEvents30d: suspiciousLogs,
        blockedReason: walletSecurity?.blocked_reason || null,
      },
      recommendedActions: [
        !kycApproved ? 'Finaliser la verification KYC' : null,
        !has2FA ? 'Activer la double authentification' : null,
        !hasWalletPin ? 'Configurer un PIN wallet' : null,
      ].filter(Boolean),
      lastVerificationUpdate: verification?.updated_at || null,
    };
  }

  async getLocalizationStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, location: true, country: true },
    });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const location = String(user.location || '').trim();
    const country = String(user.country || '').trim();
    const normalizedLocation = normalizeText(location);

    const jobsWhere: any = { status: 'open' };
    if (country || normalizedLocation) {
      jobsWhere.OR = [
        country ? { country } : null,
        normalizedLocation ? { location: { contains: location, mode: 'insensitive' } } : null,
      ].filter(Boolean);
    }

    const providersWhere: any = { status: { in: ['active', 'pending'] } };
    if (country || normalizedLocation) {
      providersWhere.OR = [
        country ? { country } : null,
        normalizedLocation ? { city: { contains: location, mode: 'insensitive' } } : null,
      ].filter(Boolean);
    }

    const [nearbyJobs, nearbyProviders, topCities] = await Promise.all([
      prisma.job.count({ where: jobsWhere }),
      prisma.serviceProvider.count({ where: providersWhere }),
      prisma.serviceProvider.findMany({
        where: country ? { country } : undefined,
        select: { city: true },
        distinct: ['city'],
        take: 5,
      }),
    ]);

    const currencyByCountry: Record<string, string> = {
      mali: 'XOF',
      senegal: 'XOF',
      'cote d ivoire': 'XOF',
      "cote d'ivoire": 'XOF',
      'burkina faso': 'XOF',
      niger: 'XOF',
      benin: 'XOF',
      togo: 'XOF',
      cameroon: 'XAF',
      cameroun: 'XAF',
      gabon: 'XAF',
      congo: 'XAF',
      chad: 'XAF',
      'guinee equatoriale': 'XAF',
      nigeria: 'NGN',
      ghana: 'GHS',
      kenya: 'KES',
      tanzania: 'TZS',
    };
    const currency = currencyByCountry[normalizeText(country)] || 'XOF';

    return {
      location: location || null,
      country: country || null,
      currency,
      nearbyOpportunities: {
        jobs: nearbyJobs,
        providers: nearbyProviders,
      },
      recommendedCities: topCities.map((c) => c.city).filter(Boolean),
      recommendation:
        nearbyJobs + nearbyProviders > 0
          ? 'Des opportunites locales sont disponibles pres de toi.'
          : 'Complete ta localisation pour recevoir des opportunites locales plus precises.',
    };
  }

  async getProgressionStatus(userId: string) {
    const [level, badgesCount, missions7d, enrollmentsCompleted, certificatesCount, matchingEvents, opportunityActions] = await Promise.all([
      prisma.userLevel.findUnique({
        where: { user_id: userId },
        select: { level: true, xp: true, next_level_xp: true },
      }),
      prisma.userBadge.count({ where: { user_id: userId } }).catch(() => 0),
      prisma.dailyMissionCompletion.count({
        where: {
          user_id: userId,
          completed_date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }).catch(() => 0),
      prisma.enrollment.count({ where: { user_id: userId, completed: true } }).catch(() => 0),
      prisma.certificate.count({ where: { user_id: userId } }).catch(() => 0),
      prisma.analytics.count({ where: { user_id: userId, entity_type: 'matching', metric_type: 'matching_request' } }),
      prisma.analytics.count({ where: { user_id: userId, entity_type: 'matching', metric_type: 'opportunity_action' } }),
    ]);

    const currentLevel = level?.level || 1;
    const currentXp = level?.xp || 0;
    const nextLevelXp = level?.next_level_xp || 100;
    const progressToNextLevel = Math.max(0, Math.min(100, Math.round((currentXp / Math.max(1, nextLevelXp)) * 100)));

    const nextMilestones = [
      missions7d < 7 ? 'Completer 7 missions journalières cette semaine' : null,
      enrollmentsCompleted < 1 ? 'Terminer une formation pour debloquer un certificat' : null,
      opportunityActions < 3 ? 'Executer 3 opportunites pour accelerer ta progression' : null,
    ].filter(Boolean) as string[];

    return {
      level: currentLevel,
      xp: currentXp,
      nextLevelXp,
      progressToNextLevel,
      badgesUnlocked: badgesCount,
      missionsCompleted7d: missions7d,
      coursesCompleted: enrollmentsCompleted,
      certificates: certificatesCount,
      matchingRequests: matchingEvents,
      opportunityActions,
      nextMilestones,
    };
  }

  async getSmartNotifications(userId: string) {
    const [dashboard, trust, localization, opportunities] = await Promise.all([
      this.getJourneyDashboard(userId),
      this.getTrustStatus(userId),
      this.getLocalizationStatus(userId),
      this.getOpportunitiesForUser(userId, {}, 6),
    ]);

    const notifications: Array<{
      id: string;
      type: 'action' | 'security' | 'opportunity';
      title: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      ctaPage: string;
    }> = [];

    if ((dashboard.kpi.conversionRevenueRate || 0) < 20) {
      notifications.push({
        id: 'n_revenue_activation',
        type: 'action',
        title: 'Active ton revenu maintenant',
        message: 'Fais un paiement rapide pour convertir tes opportunites en revenu mesurable.',
        priority: 'high',
        ctaPage: 'Wallet',
      });
    }

    if (!trust.checks.kycApproved) {
      notifications.push({
        id: 'n_kyc_required',
        type: 'security',
        title: 'Verification KYC recommandee',
        message: 'Completer ta verification augmente la confiance et debloque certaines operations.',
        priority: 'high',
        ctaPage: 'UserVerification',
      });
    }

    if ((localization.nearbyOpportunities.jobs || 0) + (localization.nearbyOpportunities.providers || 0) > 0) {
      notifications.push({
        id: 'n_local_opportunities',
        type: 'opportunity',
        title: 'Nouvelles opportunites locales',
        message: `${localization.nearbyOpportunities.jobs} jobs et ${localization.nearbyOpportunities.providers} prestataires proches de toi.`,
        priority: 'medium',
        ctaPage: 'Marketplace',
      });
    }

    const topOpportunity = opportunities.opportunities?.[0];
    if (topOpportunity) {
      notifications.push({
        id: 'n_top_opportunity',
        type: 'opportunity',
        title: 'Opportunite prioritaire',
        message: `${topOpportunity.title} (${Math.round(topOpportunity.score)} pts)`,
        priority: 'medium',
        ctaPage: topOpportunity.module === 'jobs'
          ? 'Jobs'
          : topOpportunity.module === 'courses'
            ? 'Courses'
            : topOpportunity.module === 'microcredit'
              ? 'Microcredit'
              : 'Marketplace',
      });
    }

    return notifications
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      })
      .slice(0, 5);
  }

  async getPublicOpportunityPreview(input: JourneyInput = {}, limit = 12) {
    const goal: MainGoal = input.goal || 'earn_money';
    const normalizedSkills = (input.skills || []).map((s) => normalizeText(s));
    const normalizedInterests = (input.interests || []).map((s) => normalizeText(s));
    const normalizedLocation = normalizeText(input.location || '');
    const maxItems = Math.min(Math.max(limit, 3), 30);

    const [jobs, courses, products, providers, loans] = await Promise.all([
      prisma.job.findMany({
        where: { status: 'open' },
        orderBy: [{ is_urgent: 'desc' }, { is_premium: 'desc' }, { created_at: 'desc' }],
        take: 20,
      }),
      prisma.course.findMany({
        where: { is_published: true },
        orderBy: [{ is_featured: 'desc' }, { rating: 'desc' }, { created_at: 'desc' }],
        take: 20,
      }),
      prisma.product.findMany({
        where: { status: 'active' },
        orderBy: [{ created_at: 'desc' }],
        take: 20,
      }),
      prisma.serviceProvider.findMany({
        where: { status: { in: ['active', 'pending'] } },
        orderBy: [{ is_verified: 'desc' }, { average_rating: 'desc' }, { created_at: 'desc' }],
        take: 20,
      }),
      prisma.loanRequest.findMany({
        where: { status: 'active' },
        orderBy: [{ created_at: 'desc' }],
        take: 10,
      }),
    ]);

    const opportunities: MatchingOpportunity[] = [];

    for (const job of jobs) {
      const reason: string[] = ['Job ouvert'];
      let score = scoreByGoal(goal, 'jobs');
      const haystack = `${job.title} ${job.description} ${job.category || ''}`.toLowerCase();
      if (normalizedSkills.some((s) => haystack.includes(s))) {
        score += 8;
        reason.push('Competences pertinentes');
      }
      if (normalizedInterests.some((i) => haystack.includes(i))) {
        score += 5;
        reason.push('Interets alignes');
      }
      if (normalizedLocation && normalizeText(job.location).includes(normalizedLocation)) {
        score += 10;
        reason.push('Proche de votre localisation');
      }
      opportunities.push({
        id: `job:${job.id}`,
        module: 'jobs',
        title: job.title,
        description: job.description.slice(0, 140),
        score,
        reason,
        payload: { id: job.id, category: job.category, location: job.location, type: job.job_type },
      });
    }

    for (const course of courses) {
      const reason: string[] = ['Formation disponible'];
      let score = scoreByGoal(goal, 'courses');
      const haystack = normalizeText(`${course.title} ${course.description || ''}`);
      if (normalizedSkills.some((s) => haystack.includes(s)) || normalizedInterests.some((i) => haystack.includes(i))) {
        score += 8;
        reason.push('Parcours adapte');
      }
      opportunities.push({
        id: `course:${course.id}`,
        module: 'courses',
        title: course.title,
        description: (course.description || '').slice(0, 140),
        score,
        reason,
        payload: { id: course.id, level: course.level, category: course.category, price: course.price },
      });
    }

    for (const product of products) {
      const reason: string[] = ['Produit monetisable'];
      let score = scoreByGoal(goal, 'marketplace');
      const haystack = normalizeText(`${product.name} ${product.description || ''}`);
      if (normalizedInterests.some((i) => haystack.includes(i))) {
        score += 6;
        reason.push('Interets compatibles');
      }
      opportunities.push({
        id: `product:${product.id}`,
        module: 'marketplace',
        title: product.name,
        description: (product.description || '').slice(0, 140),
        score,
        reason,
        payload: { id: product.id, price: product.price, category: product.category },
      });
    }

    for (const provider of providers) {
      const reason: string[] = ['Service disponible'];
      let score = scoreByGoal(goal, 'services');
      if (provider.is_verified) {
        score += 5;
        reason.push('Prestataire verifie');
      }
      if (normalizedLocation && normalizeText(provider.city).includes(normalizedLocation)) {
        score += 8;
        reason.push('Disponible localement');
      }
      opportunities.push({
        id: `provider:${provider.id}`,
        module: 'services',
        title: provider.bio?.slice(0, 60) || 'Prestataire recommande',
        description: `Categories: ${(provider.service_categories || []).slice(0, 3).join(', ') || 'General'}`,
        score,
        reason,
        payload: { id: provider.id, city: provider.city, country: provider.country, rating: provider.average_rating },
      });
    }

    for (const loan of loans) {
      const reason: string[] = ['Financement actif'];
      let score = scoreByGoal(goal, 'microcredit');
      if (goal === 'entrepreneur' || goal === 'earn_money') {
        score += 8;
        reason.push('Levier pour accelerer votre activite');
      }
      opportunities.push({
        id: `loan:${loan.id}`,
        module: 'microcredit',
        title: `Demande ${loan.purpose}`,
        description: `Montant: ${loan.amount_requested.toLocaleString('fr-FR')} XOF`,
        score,
        reason,
        payload: { id: loan.id, amount: loan.amount_requested, risk: loan.risk_level },
      });
    }

    const ranked = opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map((op) => ({ ...op, score: clamp(Math.round(op.score), 0, 100) }));

    return {
      goal,
      count: ranked.length,
      opportunities: ranked,
      meta: {
        source: 'rules-based-public-preview',
      },
    };
  }
}

export const matchingEngineService = new MatchingEngineService();

export default matchingEngineService;

