import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';

class JobService {
  async list(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    category?: string;
    jobType?: string;
    search?: string;
    country?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.jobType) where.job_type = filters.jobType;
    if (filters?.country) where.country = filters.country;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ is_urgent: 'desc' }, { is_premium: 'desc' }, { created_at: 'desc' }],
        include: {
          employer: { select: { id: true, full_name: true, profile_image: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(jobId: string, incrementView?: boolean) {
    if (incrementView) {
      await prisma.job.update({
        where: { id: jobId },
        data: { views_count: { increment: 1 } },
      });
    }
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            full_name: true,
            profile_image: true,
            email: true,
            company_profile: true,
          },
        },
        applications: {
          take: 20,
          orderBy: { created_at: 'desc' },
          include: {
            applicant: {
              select: {
                id: true,
                full_name: true,
                profile_image: true,
                email: true,
                candidate_profile: true,
              },
            },
          },
        },
        _count: { select: { applications: true } },
      },
    });

    return job;
  }

  // Frais de publication premium : 5000 FCFA (100% pour la plateforme)
  private readonly PREMIUM_JOB_FEE = 5000;
  // Nombre d'offres gratuites par mois par employeur (au-delà = premium requis)
  private readonly FREE_JOBS_PER_MONTH = 3;

  async create(employerId: string, data: {
    title: string;
    description: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    jobType: string;
    category?: string;
    country?: string;
    expiresAt?: Date;
    isPremium?: boolean;
    isUrgent?: boolean;
    phone?: string;
  }) {
    // Limite gratuite : au-delà de FREE_JOBS_PER_MONTH par mois, exiger premium
    if (!data.isPremium) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const countThisMonth = await prisma.job.count({
        where: {
          employer_id: employerId,
          created_at: { gte: startOfMonth },
        },
      });
      if (countThisMonth >= this.FREE_JOBS_PER_MONTH) {
        const err: any = new Error(
          `Limite des ${this.FREE_JOBS_PER_MONTH} offres gratuites ce mois atteinte. Passez en offre premium pour publier.`
        );
        err.statusCode = 403;
        throw err;
      }
    }
    const baseData = {
      employer_id: employerId,
      title: data.title,
      description: data.description,
      location: data.location,
      salary_min: data.salaryMin,
      salary_max: data.salaryMax,
      salary_currency: data.salaryCurrency || 'XOF',
      job_type: data.jobType,
      category: data.category,
      country: data.country,
      expires_at: data.expiresAt,
      is_premium: data.isPremium || false,
      is_urgent: data.isUrgent || false,
    };
    if (data.isPremium && data.phone) {
      const job = await prisma.job.create({
        data: {
          ...baseData,
          status: 'pending',
        },
      });

      // Créer transaction pour paiement premium
      const transaction = await prisma.transaction.create({
        data: {
          user_id: employerId,
          type: 'job_premium',
          amount: this.PREMIUM_JOB_FEE,
          currency: 'XOF',
          status: 'pending',
          payment_method: 'orange_money',
          phone_number: data.phone,
          description: `Publication premium - ${data.title}`,
          reference_id: job.id,
        },
      });

      try {
        const paymentResult = await paymentService.initiateOrangeMoneyPayment(
          employerId,
          transaction.id,
          {
            amount: this.PREMIUM_JOB_FEE,
            phone: data.phone,
            returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/jobs/${job.id}?premium=success`,
          }
        );

        return {
          ...job,
          paymentUrl: paymentResult.paymentUrl,
          transactionId: transaction.id,
          isPremium: true,
        };
      } catch (error: any) {
        await prisma.job.delete({ where: { id: job.id } });
        await prisma.transaction.delete({ where: { id: transaction.id } });
        throw error;
      }
    }

    const job = await prisma.job.create({
      data: {
        ...baseData,
        status: 'open',
      },
    });

    logger.info('Job created', { employerId, jobId: job.id, isPremium: data.isPremium || false });
    return job;
  }

  /**
   * Confirmer le paiement premium d'un job
   */
  async confirmPremiumPayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'job_premium') {
      throw new Error('Transaction not found or invalid type');
    }

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
      },
    });

    // Créditer la plateforme (100% des frais)
    await platformRevenueService.addRevenue(
      transaction.amount,
      'job_premium',
      `Frais publication premium - Job ${transaction.reference_id}`,
      transactionId
    );

    await prisma.job.update({
      where: { id: transaction.reference_id! },
      data: { status: 'open', is_premium: true },
    });

    logger.info('Premium job payment confirmed', { transactionId, jobId: transaction.reference_id });
    return transaction;
  }

  async apply(jobId: string, applicantId: string, coverLetter?: string, resumeUrl?: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'open') throw new Error('Job not found or not open');

    const existing = await prisma.jobApplication.findFirst({
      where: { job_id: jobId, applicant_id: applicantId },
    });
    if (existing) throw new Error('Already applied');

    let cv = resumeUrl;
    if (!cv) {
      const profile = await prisma.candidateProfile.findUnique({
        where: { user_id: applicantId },
        select: { cv_url: true },
      });
      cv = profile?.cv_url ?? undefined;
    }

    const application = await prisma.jobApplication.create({
      data: {
        job_id: jobId,
        applicant_id: applicantId,
        cover_letter: coverLetter,
        resume_url: cv,
        status: 'pending',
      },
    });

    logger.info('Job application submitted', { jobId, applicantId });
    return application;
  }

  async updateApplicationStatus(applicationId: string, employerId: string, status: 'pending' | 'reviewed' | 'accepted' | 'rejected') {
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!app || app.job.employer_id !== employerId) throw new Error('Application not found');
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status, updated_at: new Date() },
    });
    return prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { applicant: { select: { full_name: true, email: true, candidate_profile: true } } } });
  }

  async getEmployerDashboard(employerId: string) {
    const jobs = await prisma.job.findMany({
      where: { employer_id: employerId },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { applications: true } },
        applications: {
          take: 20,
          orderBy: { created_at: 'desc' },
          include: {
            applicant: { select: { id: true, full_name: true, profile_image: true, email: true, candidate_profile: true } },
          },
        },
      },
    });

    type JobWithCount = { views_count?: number; status: string; _count: { applications: number }; applications?: { status: string }[]; id: string; title: string; applications_count?: number };
    const totalViews = jobs.reduce((s: number, j: JobWithCount) => s + (j.views_count || 0), 0);
    const totalApplications = jobs.reduce((s: number, j: JobWithCount) => s + (j._count?.applications ?? 0), 0);
    const openJobs = jobs.filter((j: JobWithCount) => j.status === 'open').length;
    const statusBreakdown = { pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
    jobs.forEach((j: JobWithCount) => {
      (j.applications || []).forEach((a: { status: string }) => {
        const k = a.status as keyof typeof statusBreakdown;
        if (statusBreakdown[k] !== undefined) statusBreakdown[k]++;
      });
    });
    const conversionRate =
      totalViews > 0 ? Math.round((totalApplications / totalViews) * 10000) / 100 : 0;

    return {
      totalViews,
      totalApplications,
      openJobs,
      applicationStatusBreakdown: statusBreakdown,
      conversionRate,
      jobs: jobs.map((j: JobWithCount) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        views_count: j.views_count,
        applications_count: (j as { _count?: { applications: number } })._count?.applications ?? 0,
        applications: j.applications,
      })),
    };
  }

  /** Recommandation emplois : par profil candidat (skills, category), pays, offres ouvertes */
  async getRecommendedJobs(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, candidate_profile: true },
    });
    const profile = user?.candidate_profile as { skills?: string[]; experience?: { title?: string }[] } | null;
    const skills = profile?.skills ?? [];
    const where: any = { status: 'open' };
    if (user?.country) where.country = user.country;
    if (skills.length > 0) {
      where.OR = [
        { category: { in: skills } },
        { title: { contains: skills[0], mode: 'insensitive' } },
      ];
    }
    const jobs = await prisma.job.findMany({
      where,
      take: limit,
      orderBy: [{ is_urgent: 'desc' }, { is_premium: 'desc' }, { created_at: 'desc' }],
      include: {
        employer: { select: { id: true, full_name: true, profile_image: true, company_profile: true } },
        _count: { select: { applications: true } },
      },
    });
    return jobs;
  }

  async getCandidateProfile(userId: string) {
    return prisma.candidateProfile.findUnique({
      where: { user_id: userId },
    });
  }

  async upsertCandidateProfile(userId: string, data: {
    cv_url?: string;
    portfolio_url?: string;
    skills?: string[];
    experience?: object[];
    education?: object[];
    availability?: string;
    phone?: string;
  }) {
    return prisma.candidateProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        cv_url: data.cv_url,
        portfolio_url: data.portfolio_url,
        skills: data.skills ?? undefined,
        experience: data.experience ?? undefined,
        education: data.education ?? undefined,
        availability: data.availability,
        phone: data.phone,
        updated_at: new Date(),
      },
      update: {
        cv_url: data.cv_url,
        portfolio_url: data.portfolio_url,
        skills: data.skills,
        experience: data.experience,
        education: data.education,
        availability: data.availability,
        phone: data.phone,
        updated_at: new Date(),
      },
    });
  }

  async getCompanyProfile(userId: string) {
    return prisma.companyProfile.findUnique({
      where: { user_id: userId },
    });
  }

  async upsertCompanyProfile(userId: string, data: {
    company_name?: string;
    description?: string;
    logo_url?: string;
    documents_legal?: string;
  }) {
    return prisma.companyProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        company_name: data.company_name,
        description: data.description,
        logo_url: data.logo_url,
        documents_legal: data.documents_legal,
        updated_at: new Date(),
      },
      update: {
        company_name: data.company_name,
        description: data.description,
        logo_url: data.logo_url,
        documents_legal: data.documents_legal,
        updated_at: new Date(),
      },
    });
  }

  async rateCompany(fromUserId: string, toUserId: string, jobId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');
    const app = await prisma.jobApplication.findFirst({
      where: { job_id: jobId, applicant_id: fromUserId },
      include: { job: true },
    });
    if (!app || app.job.employer_id !== toUserId) throw new Error('Application not found');
    const existing = await prisma.companyRating.findFirst({
      where: { from_user_id: fromUserId, to_user_id: toUserId, job_id: jobId },
    });
    if (existing) {
      await prisma.companyRating.update({
        where: { id: existing.id },
        data: { rating, comment, created_at: new Date() },
      });
    } else {
      await prisma.companyRating.create({
        data: { from_user_id: fromUserId, to_user_id: toUserId, job_id: jobId, rating, comment },
      });
    }
    const agg = await prisma.companyRating.aggregate({
      where: { to_user_id: toUserId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.companyProfile.updateMany({
      where: { user_id: toUserId },
      data: { rating_avg: agg._avg.rating ?? 0, rating_count: agg._count, updated_at: new Date() },
    });
    return { rating, average: agg._avg.rating };
  }

  async rateCandidate(fromUserId: string, toUserId: string, jobId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');
    const app = await prisma.jobApplication.findFirst({
      where: { job_id: jobId, applicant_id: toUserId },
      include: { job: true },
    });
    if (!app || app.job.employer_id !== fromUserId) throw new Error('Application not found');
    await prisma.candidateRating.upsert({
      where: {
        from_user_id_to_user_id_job_id: { from_user_id: fromUserId, to_user_id: toUserId, job_id: jobId },
      },
      create: { from_user_id: fromUserId, to_user_id: toUserId, job_id: jobId, rating, comment },
      update: { rating, comment, created_at: new Date() },
    });
    return { rating };
  }

  async saveJob(jobId: string, userId: string) {
    await prisma.savedJob.upsert({
      where: { job_id_user_id: { job_id: jobId, user_id: userId } },
      create: { job_id: jobId, user_id: userId },
      update: {},
    });
    return { saved: true };
  }

  async unsaveJob(jobId: string, userId: string) {
    await prisma.savedJob.deleteMany({
      where: { job_id: jobId, user_id: userId },
    });
    return { saved: false };
  }

  async getSavedJobs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [saved, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { job: { include: { employer: { select: { full_name: true } } } } },
      }),
      prisma.savedJob.count({ where: { user_id: userId } }),
    ]);
    return {
      jobs: saved.map((s: { job: unknown }) => s.job),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new JobService();

