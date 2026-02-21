import crypto from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { validateUrl } from '../utils/urlValidator.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import GamificationEngine from './gamification.service.js';
import courseProviderService from './courseProvider.service.js';

type SortOption = 'popular' | 'rating' | 'newest' | 'price_low' | 'price_high';
type PriceFilter = 'all' | 'free' | 'paid';

class CourseService {
  async list(page: number = 1, limit: number = 20, filters?: {
    category?: string;
    level?: string;
    isPublished?: boolean;
    search?: string;
    price?: PriceFilter;
    sort?: SortOption;
  }) {
    const skip = (page - 1) * limit;
    const take = Math.min(50, Math.max(1, limit));
    const approvedCreatorIds = await courseProviderService.getApprovedUserIds();
    const where: Record<string, unknown> = {};

    if (approvedCreatorIds.length > 0) {
      where.creator_id = { in: approvedCreatorIds };
    } else {
      where.creator_id = { in: [] };
    }
    if (filters?.category) where.category = filters.category;
    if (filters?.level) where.level = filters.level;
    where.is_published = filters?.isPublished ?? true;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.price === 'free') where.price = 0;
    if (filters?.price === 'paid') where.price = { gt: 0 };

    const orderBy = (() => {
      switch (filters?.sort) {
        case 'rating': return { rating: 'desc' as const };
        case 'newest': return { created_at: 'desc' as const };
        case 'price_low': return { price: 'asc' as const };
        case 'price_high': return { price: 'desc' as const };
        default: return { students_count: 'desc' as const };
      }
    })();

    const [coursesRaw, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: { select: { id: true, full_name: true, username: true, profile_image: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    const courses = coursesRaw.map((c) => ({
      ...c,
      instructor_id: c.creator_id,
      instructor_name: c.creator?.full_name ?? c.creator?.username ?? null,
      instructor_avatar: c.creator?.profile_image ?? null,
    }));

    return {
      courses,
      pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async getById(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: { select: { id: true, full_name: true, username: true, profile_image: true } },
        lessons: { orderBy: { order: 'asc' } },
        enrollments: { take: 10, include: { user: { select: { id: true, username: true, profile_image: true } } } },
      },
    });
    if (!course) return null;
    return {
      ...course,
      instructor_id: course.creator_id,
      instructor_name: course.creator?.full_name ?? course.creator?.username ?? null,
      instructor_avatar: course.creator?.profile_image ?? null,
    };
  }

  async getMyEnrollment(courseId: string, userId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        course_id_user_id: { course_id: courseId, user_id: userId },
      },
      include: {
        course: { select: { id: true, title: true, certificate_enabled: true } },
      },
    });
    return enrollment;
  }

  async create(creatorId: string, data: {
    title: string;
    description: string;
    thumbnailUrl?: string;
    trailerUrl?: string;
    price: number;
    category?: string;
    level?: string;
    durationHours?: number;
    currency?: string;
    language?: string;
    certificateEnabled?: boolean;
  }) {
    validateUrl(data.thumbnailUrl, 'thumbnail_url');
    validateUrl(data.trailerUrl, 'trailer_url');

    const course = await prisma.course.create({
      data: {
        creator_id: creatorId,
        title: data.title,
        description: data.description,
        thumbnail_url: data.thumbnailUrl,
        trailer_url: data.trailerUrl,
        price: data.price,
        currency: data.currency ?? 'XOF',
        category: data.category,
        level: data.level,
        duration_hours: data.durationHours,
        language: data.language ?? 'fr',
        certificate_enabled: data.certificateEnabled ?? true,
        is_published: false,
      },
    });

    logger.info('Course created', { creatorId, courseId: course.id });
    return course;
  }

  async getRecommendations(userId: string, limit: number = 10) {
    const enrolled = await prisma.enrollment.findMany({
      where: { user_id: userId },
      select: { course_id: true },
    });
    const enrolledIds = enrolled.map((e) => e.course_id);
    const wishlist = await prisma.courseWishlist.findMany({
      where: { user_id: userId },
      select: { course_id: true },
    });
    const wishlistIds = wishlist.map((w) => w.course_id);
    const exclude = [...new Set([...enrolledIds, ...wishlistIds])];

    const courses = await prisma.course.findMany({
      where: {
        is_published: true,
        ...(exclude.length ? { id: { notIn: exclude } } : {}),
      },
      take: limit,
      orderBy: [{ is_featured: 'desc' }, { rating: 'desc' }, { students_count: 'desc' }],
      include: {
        creator: { select: { id: true, full_name: true, username: true, profile_image: true } },
      },
    });
    return courses;
  }

  async wishlistAdd(userId: string, courseId: string) {
    await prisma.courseWishlist.upsert({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      create: { id: crypto.randomUUID(), user_id: userId, course_id: courseId },
      update: {},
    });
    return { success: true };
  }

  async wishlistRemove(userId: string, courseId: string) {
    await prisma.courseWishlist.deleteMany({ where: { user_id: userId, course_id: courseId } });
    return { success: true };
  }

  async wishlistList(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.courseWishlist.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          course: {
            include: { creator: { select: { id: true, full_name: true, username: true, profile_image: true } } },
          },
        },
      }),
      prisma.courseWishlist.count({ where: { user_id: userId } }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getReviews(courseId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      prisma.courseReview.findMany({
        where: { course_id: courseId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, full_name: true, username: true, profile_image: true } } },
      }),
      prisma.courseReview.count({ where: { course_id: courseId } }),
    ]);
    return { reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async addReview(courseId: string, userId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
    const review = await prisma.courseReview.upsert({
      where: { course_id_user_id: { course_id: courseId, user_id: userId } },
      create: { id: crypto.randomUUID(), course_id: courseId, user_id: userId, rating, comment: comment ?? null },
      update: { rating, comment: comment ?? undefined },
    });
    const agg = await prisma.courseReview.aggregate({
      where: { course_id: courseId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.course.update({
      where: { id: courseId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviews_count: agg._count,
      },
    });
    return review;
  }

  // Commission plateforme : 15% sur les cours
  private readonly PLATFORM_COMMISSION_RATE = 0.15;

  async enroll(courseId: string, userId: string, data?: {
    phone?: string;
  }) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: true,
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (!course.is_published) {
      throw new Error('Course not published');
    }

    const existing = await prisma.enrollment.findFirst({
      where: {
        course_id: courseId,
        user_id: userId,
      },
    });

    if (existing) {
      throw new Error('Already enrolled');
    }

    // Si le cours est gratuit (price = 0), inscrire directement
    if (course.price === 0) {
      const enrollment = await prisma.enrollment.create({
        data: {
          course_id: courseId,
          user_id: userId,
          progress: 0,
        },
      });

      await prisma.course.update({
        where: { id: courseId },
        data: {
          students_count: { increment: 1 },
        },
      });

      GamificationEngine.onCourseEnroll(userId).catch((e) => logger.warn('Gamification onCourseEnroll', e));
      logger.info('User enrolled in free course', { courseId, userId });
      return enrollment;
    }

    // Si le cours est payant, créer l'inscription en attente
    const enrollment = await prisma.enrollment.create({
      data: {
        course_id: courseId,
        user_id: userId,
        progress: 0,
      },
    });

    // Si phone fourni, initier paiement Orange Money
    if (data?.phone) {
      const transaction = await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'course_payment',
          amount: course.price,
          currency: 'XOF',
          status: 'pending',
          payment_method: 'orange_money',
          phone_number: data.phone,
          description: `Paiement cours - ${course.title}`,
          reference_id: enrollment.id,
        },
      });

      try {
        const paymentResult = await paymentService.initiateOrangeMoneyPayment(
          userId,
          enrollment.id,
          {
            amount: course.price,
            phone: data.phone,
            returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/courses/${courseId}?enrollment=success`,
          }
        );

        logger.info('Course enrollment created and Orange Money payment initiated', {
          enrollmentId: enrollment.id,
          courseId,
          userId,
          amount: course.price,
        });

        return {
          ...enrollment,
          paymentUrl: paymentResult.paymentUrl,
          transactionId: transaction.id,
        };
      } catch (error: any) {
        await prisma.enrollment.delete({ where: { id: enrollment.id } });
        await prisma.transaction.delete({ where: { id: transaction.id } });
        throw error;
      }
    }

    // Si pas de phone, retourner l'enrollment en attente
    return enrollment;
  }

  /**
   * Confirmer le paiement d'un cours
   */
  async confirmCoursePayment(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Calculer les montants
    const platformFee = enrollment.course.price * this.PLATFORM_COMMISSION_RATE;
    const creatorEarnings = enrollment.course.price - platformFee;

    // Mettre à jour la transaction
    await prisma.transaction.updateMany({
      where: {
        reference_id: enrollmentId,
        type: 'course_payment',
      },
      data: {
        status: 'completed',
      },
    });

    // Créditer le wallet du créateur
    const sellerWallet = await withdrawalService.getSellerWallet(enrollment.course.creator_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: creatorEarnings,
        },
      },
    });

    // Créer transaction pour le créateur
    await prisma.transaction.create({
      data: {
        user_id: enrollment.course.creator_id,
        type: 'course_received',
        amount: creatorEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Vente cours - ${enrollment.course.title} (${enrollment.course.price} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: enrollmentId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 15%)
    await platformRevenueService.addRevenue(
      platformFee,
      'courses',
      `Commission cours - ${enrollment.course.title} (${enrollment.course.price} FCFA)`,
      enrollmentId
    );

    // Mettre à jour le compteur d'étudiants
    await prisma.course.update({
      where: { id: enrollment.course_id },
      data: {
        students_count: { increment: 1 },
      },
    });

    GamificationEngine.onCourseEnroll(enrollment.user_id).catch((e) => logger.warn('Gamification onCourseEnroll', e));
    logger.info('Course payment confirmed', {
      enrollmentId,
      courseId: enrollment.course_id,
      creatorEarnings,
      platformFee,
    });

    return enrollment;
  }

  async updateProgress(enrollmentId: string, progress: number) {
    const pct = Math.min(100, Math.max(0, progress));
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { select: { certificate_enabled: true } } },
    });
    if (!enrollment) throw new Error('Enrollment not found');

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress: pct,
        progress_percentage: pct,
        completed: pct >= 100,
        completed_at: pct >= 100 ? new Date() : null,
      },
    });

    if (pct >= 100 && !enrollment.certificate_id && enrollment.course.certificate_enabled) {
      const cert = await prisma.certificate.create({
        data: {
          course_id: enrollment.course_id,
          user_id: enrollment.user_id,
          certificate_url: `https://certificates.afriwonder.com/${enrollmentId}`,
        },
      });
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { certificate_id: cert.id },
      });
    }

    logger.info('Course progress updated', { enrollmentId, progress: pct });
    return updated;
  }

  /**
   * Marquer une leçon comme complétée et recalculer la progression.
   * Si 100%, crée le certificat (verification_token géré par Prisma).
   */
  async completeLesson(enrollmentId: string, lessonId: string, userId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          select: { certificate_enabled: true },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!enrollment || enrollment.user_id !== userId) throw new Error('Enrollment not found or unauthorized');

    const lessons = enrollment.course.lessons;
    const index = lessons.findIndex((l) => l.id === lessonId);
    if (index < 0) throw new Error('Lesson not found in this course');
    const completedCount = index + 1;
    const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        last_lesson_id: lessonId,
        progress_percentage: progressPercentage,
        progress: progressPercentage,
        completed: progressPercentage >= 100,
        completed_at: progressPercentage >= 100 ? new Date() : null,
      },
    });

    if (progressPercentage >= 100 && !enrollment.certificate_id && enrollment.course.certificate_enabled) {
      const cert = await prisma.certificate.create({
        data: {
          course_id: enrollment.course_id,
          user_id: enrollment.user_id,
          certificate_url: `https://certificates.afriwonder.com/${enrollmentId}`,
        },
      });
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { certificate_id: cert.id },
      });
      GamificationEngine.onCourseComplete(userId).catch((e) => logger.warn('Gamification onCourseComplete', e));
    }

    logger.info('Lesson completed', { enrollmentId, lessonId, progressPercentage });
    return updated;
  }

  /**
   * Dashboard instructeur : revenus, stats par cours, taux de complétion.
   */
  async getInstructorDashboard(creatorId: string) {
    const courses = await prisma.course.findMany({
      where: { creator_id: creatorId },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { completed: true },
          select: { id: true },
        },
      },
    });

    const courseIds = courses.map((c) => c.id);
    const revenueByCourse = await prisma.transaction.groupBy({
      by: ['reference_id'],
      _sum: { amount: true },
      where: {
        user_id: creatorId,
        type: 'course_received',
        status: 'completed',
        reference_id: { in: await prisma.enrollment.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } }).then((e) => e.map((x) => x.id)) },
      },
    });
    const enrollmentIds = await prisma.enrollment.findMany({ where: { course_id: { in: courseIds } }, select: { id: true } }).then((e) => e.map((x) => x.id));
    const revenueMap = new Map<string, number>();
    const revList = await prisma.transaction.findMany({
      where: { user_id: creatorId, type: 'course_received', status: 'completed', reference_id: { in: enrollmentIds } },
      select: { reference_id: true, amount: true },
    });
    const enrollToCourse = await prisma.enrollment.findMany({ where: { id: { in: enrollmentIds } }, select: { id: true, course_id: true } });
    const refToCourse = new Map(enrollToCourse.map((e) => [e.id, e.course_id]));
    revList.forEach((t) => {
      if (!t.reference_id) return;
      const cid = refToCourse.get(t.reference_id);
      if (cid) revenueMap.set(cid, (revenueMap.get(cid) ?? 0) + t.amount);
    });

    const totalRevenue = Array.from(revenueMap.values()).reduce((a, b) => a + b, 0);
    const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
    const totalCompletions = courses.reduce((acc, c) => acc + c.enrollments.length, 0);
    const completionRate = totalStudents > 0 ? Math.round((totalCompletions / totalStudents) * 100) : 0;

    const coursesWithStats = courses.map((c) => ({
      id: c.id,
      title: c.title,
      students_count: c._count.enrollments,
      completions: c.enrollments.length,
      completion_rate: c._count.enrollments > 0 ? Math.round((c.enrollments.length / c._count.enrollments) * 100) : 0,
      revenue: revenueMap.get(c.id) ?? 0,
    }));

    const recentEnrollments = await prisma.enrollment.findMany({
      where: { course: { creator_id: creatorId } },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, full_name: true, username: true, profile_image: true } },
        course: { select: { id: true, title: true } },
      },
    });

    return {
      total_revenue: totalRevenue,
      total_students: totalStudents,
      total_completions: totalCompletions,
      completion_rate: completionRate,
      courses: coursesWithStats,
      recent_enrollments: recentEnrollments,
    };
  }

  /**
   * Retourne l'URL de stream d'une leçon après vérification enrollment (évite exposition directe de l'URL).
   * quality = '240' | '720' pour vidéo adaptative si leçon a video_url_240p / video_url_720p.
   */
  async getLessonStreamUrl(enrollmentId: string, lessonId: string, userId: string, quality?: '240' | '720'): Promise<{ url: string; expiresIn: number } | null> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { include: { lessons: { where: { id: lessonId }, take: 1 } } } },
    });
    if (!enrollment || enrollment.user_id !== userId) return null;
    const lesson = enrollment.course?.lessons?.[0] as { video_url?: string | null; video_url_240p?: string | null; video_url_720p?: string | null } | undefined;
    if (!lesson) return null;
    let url = '';
    if (quality === '240' && lesson.video_url_240p) url = lesson.video_url_240p;
    else if (quality === '720' && lesson.video_url_720p) url = lesson.video_url_720p;
    else url = (lesson as { video_url?: string | null }).video_url || '';
    if (!url) return null;
    return { url, expiresIn: 3600 };
  }
}

export default new CourseService();

