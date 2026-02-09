/**
 * Module News / Média — Production ready
 * Vues réelles (1/user ou ip/24h), likes, commentaires imbriqués, trending, breaking, préférences, premium, SEO.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const TRENDING_VIEWS_WEIGHT = 0.4;
const TRENDING_LIKES_WEIGHT = 0.3;
const TRENDING_COMMENTS_WEIGHT = 0.2;
const TRENDING_SHARES_WEIGHT = 0.1;
const VIEW_WINDOW_HOURS = 24;
const BANNED_WORDS = ['spam', 'insulte']; // à étendre ou charger depuis config

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + (process.env.VIEW_SALT || 'news-view')).digest('hex').slice(0, 32);
}

function sanitizeHtmlFragment(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

export class NewsService {
  /** Liste avec filtres, pagination, tri */
  async list(params: {
    page?: number;
    limit?: number;
    category?: string;
    country?: string;
    language?: string;
    status?: string;
    isPublished?: boolean;
    isBreaking?: boolean;
    isFeatured?: boolean;
    isSponsored?: boolean;
    search?: string;
    orderBy?: 'published_at' | 'created_at' | 'views' | 'likes_count';
    orderDir?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const where: any = {};

    if (params.category) where.category = params.category;
    if (params.country) where.country = params.country;
    if (params.language) where.language = params.language;
    if (params.status) where.status = params.status;
    if (params.isPublished !== undefined) where.is_published = params.isPublished;
    if (params.isBreaking !== undefined) where.is_breaking = params.isBreaking;
    if (params.isFeatured !== undefined) where.is_featured = params.isFeatured;
    if (params.isSponsored !== undefined) where.is_sponsored = params.isSponsored;

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { subtitle: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
        { excerpt: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = (params.orderBy && params.orderBy in { published_at: 1, created_at: 1, views: 1, likes_count: 1 })
      ? { [params.orderBy]: params.orderDir ?? 'desc' }
      : { published_at: 'desc' as const };

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: { select: { id: true, full_name: true, profile_image: true } },
          verified_source: { select: { id: true, name: true, logo: true, trust_score: true } },
        },
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return {
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Récupérer par ID ou slug */
  async getByIdOrSlug(idOrSlug: string, options?: { incrementView?: boolean; userId?: string; ip?: string }) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
    const article = await prisma.newsArticle.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        author: { select: { id: true, full_name: true, profile_image: true } },
        verified_source: { select: { id: true, name: true, logo: true, website: true, trust_score: true } },
      },
    });
    if (!article) return null;

    if (options?.incrementView && (options.userId || options.ip)) {
      await this.recordView(article.id, options.userId, options.ip);
    }

    return article;
  }

  /** Enregistrer une vue : 1 par (user_id ou ip_hash) par 24h, incrément atomique */
  async recordView(articleId: string, userId?: string | null, ip?: string) {
    const since = new Date(Date.now() - VIEW_WINDOW_HOURS * 60 * 60 * 1000);
    const ipHash = ip ? hashIp(ip) : null;

    const existing = await prisma.articleView.findFirst({
      where: {
        article_id: articleId,
        viewed_at: { gte: since },
        ...(userId ? { user_id: userId } : ipHash ? { ip_hash: ipHash } : { id: 'impossible' }),
      },
    });
    if (existing) return { counted: false };

    await prisma.$transaction([
      prisma.articleView.create({
        data: {
          article_id: articleId,
          user_id: userId || null,
          ip_hash: ipHash || hashIp('anonymous'),
        },
      }),
      prisma.newsArticle.update({
        where: { id: articleId },
        data: { views: { increment: 1 } },
      }),
    ]);
    return { counted: true };
  }

  /** Like / Unlike */
  async toggleLike(articleId: string, userId: string) {
    const existing = await prisma.articleLike.findUnique({
      where: { article_id_user_id: { article_id: articleId, user_id: userId } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.articleLike.delete({ where: { id: existing.id } }),
        prisma.newsArticle.update({
          where: { id: articleId },
          data: { likes_count: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    }
    await prisma.$transaction([
      prisma.articleLike.create({
        data: { article_id: articleId, user_id: userId },
      }),
      prisma.newsArticle.update({
        where: { id: articleId },
        data: { likes_count: { increment: 1 } },
      }),
    ]);
    return { liked: true };
  }

  /** Liste des commentaires avec réponses imbriquées */
  async listComments(articleId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const comments = await prisma.articleComment.findMany({
      where: { article_id: articleId, is_deleted: false, parent_id: null },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, full_name: true, profile_image: true } },
        replies: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' },
          include: { user: { select: { id: true, full_name: true, profile_image: true } } },
        },
      },
    });
    return comments;
  }

  /** Ajouter un commentaire (parent_id pour réponse) */
  async addComment(articleId: string, userId: string, content: string, parentId?: string | null) {
    const sanitized = sanitizeHtmlFragment(content).trim();
    if (!sanitized || sanitized.length > 2000) throw new Error('Contenu invalide ou trop long');
    const lower = sanitized.toLowerCase();
    if (BANNED_WORDS.some((w) => lower.includes(w))) throw new Error('Contenu non autorisé');

    const comment = await prisma.articleComment.create({
      data: {
        article_id: articleId,
        user_id: userId,
        parent_id: parentId || null,
        content: sanitized,
      },
    });
    await prisma.newsArticle.update({
      where: { id: articleId },
      data: { comments_count: { increment: 1 } },
    });
    const withUser = await prisma.articleComment.findUnique({
      where: { id: comment.id },
      include: { user: { select: { id: true, full_name: true, profile_image: true } } },
    });
    return withUser;
  }

  /** Signaler / Supprimer commentaire (admin ou auteur) */
  async deleteComment(commentId: string, userId: string, isAdmin: boolean) {
    const comment = await prisma.articleComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Commentaire introuvable');
    if (!isAdmin && comment.user_id !== userId) throw new Error('Non autorisé');
    await prisma.$transaction([
      prisma.articleComment.update({
        where: { id: commentId },
        data: { is_deleted: true },
      }),
      prisma.newsArticle.update({
        where: { id: comment.article_id },
        data: { comments_count: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  async reportComment(commentId: string) {
    await prisma.articleComment.update({
      where: { id: commentId },
      data: { is_reported: true },
    });
    return { ok: true };
  }

  /** Préférences utilisateur */
  async getPreferences(userId: string) {
    return prisma.userNewsPreference.findUnique({
      where: { user_id: userId },
    });
  }

  async savePreferences(userId: string, data: {
    preferred_categories?: string[];
    preferred_country?: string;
    preferred_language?: string;
  }) {
    return prisma.userNewsPreference.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        preferred_categories: data.preferred_categories ?? [],
        preferred_country: data.preferred_country ?? null,
        preferred_language: data.preferred_language ?? null,
      },
      update: {
        preferred_categories: data.preferred_categories ?? undefined,
        preferred_country: data.preferred_country ?? undefined,
        preferred_language: data.preferred_language ?? undefined,
      },
    });
  }

  /** Feed personnalisé : scoring +3 catégorie, +2 pays, +1 tendance */
  async getFeed(userId: string, page = 1, limit = 20) {
    const prefs = await prisma.userNewsPreference.findUnique({
      where: { user_id: userId },
    });
    const categories = (prefs?.preferred_categories as string[] | null) ?? [];
    const country = prefs?.preferred_country ?? null;
    const lang = prefs?.preferred_language ?? null;

    const articles = await prisma.newsArticle.findMany({
      where: { status: 'published', is_published: true },
      take: limit * 3,
      orderBy: { published_at: 'desc' },
      include: {
        author: { select: { id: true, full_name: true, profile_image: true } },
        verified_source: { select: { id: true, name: true, logo: true } },
        trending: { take: 1, orderBy: { calculated_at: 'desc' } },
      },
    });

    const scored = articles.map((a) => {
      let score = 0;
      if (a.category && categories.includes(a.category)) score += 3;
      if (country && a.country === country) score += 2;
      if (lang && a.language === lang) score += 1;
      if (a.trending && a.trending.length > 0) score += 1;
      return { ...a, _score: score };
    });
    scored.sort((a, b) => b._score - a._score);
    const skip = (page - 1) * limit;
    const paginated = scored.slice(skip, skip + limit).map(({ _score, trending, ...a }) => a);
    return {
      articles: paginated,
      pagination: { page, limit, total: scored.length, totalPages: Math.ceil(scored.length / limit) },
    };
  }

  /** Breaking news (actives, non expirées, priorité) */
  async getBreaking() {
    const now = new Date();
    return prisma.newsArticle.findMany({
      where: {
        is_breaking: true,
        is_published: true,
        status: 'published',
        OR: [{ breaking_expiry_at: null }, { breaking_expiry_at: { gt: now } }],
      },
      orderBy: [{ breaking_priority: 'desc' }, { published_at: 'desc' }],
      take: 10,
      include: {
        author: { select: { id: true, full_name: true, profile_image: true } },
        verified_source: { select: { id: true, name: true, logo: true } },
      },
    });
  }

  /** Trending (calculé par cron) */
  async getTrending(limit = 10) {
    const rows = await prisma.trendingArticle.findMany({
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        article: {
          include: {
            author: { select: { id: true, full_name: true, profile_image: true } },
            verified_source: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    });
    return rows.map((r) => r.article).filter(Boolean);
  }

  /** Calculer trending score (cron) */
  async calculateTrending() {
    const articles = await prisma.newsArticle.findMany({
      where: { status: 'published', is_published: true, published_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { id: true, views: true, likes_count: true, comments_count: true, shares_count: true },
    });
    for (const a of articles) {
      const score =
        a.views * TRENDING_VIEWS_WEIGHT +
        a.likes_count * TRENDING_LIKES_WEIGHT +
        a.comments_count * TRENDING_COMMENTS_WEIGHT +
        a.shares_count * TRENDING_SHARES_WEIGHT;
      await prisma.trendingArticle.upsert({
        where: { article_id: a.id },
        create: { article_id: a.id, score },
        update: { score, calculated_at: new Date() },
      });
    }
    logger.info('News trending calculated', { count: articles.length });
  }

  /** Désactiver breaking expirés (cron) */
  async expireBreaking() {
    const result = await prisma.newsArticle.updateMany({
      where: { is_breaking: true, breaking_expiry_at: { lt: new Date() } },
      data: { is_breaking: false },
    });
    if (result.count > 0) logger.info('News breaking expired', { count: result.count });
    return result.count;
  }

  /** Incrémenter partage */
  async incrementShare(articleId: string) {
    await prisma.newsArticle.update({
      where: { id: articleId },
      data: { shares_count: { increment: 1 } },
    });
    return { ok: true };
  }

  /** Vérifier abonnement premium */
  async hasPremiumAccess(userId: string): Promise<boolean> {
    const sub = await prisma.newsPremiumSubscription.findFirst({
      where: { user_id: userId, expires_at: { gt: new Date() } },
    });
    return !!sub;
  }

  /** Créer article (admin/author) */
  async create(authorId: string, data: {
    title: string;
    subtitle?: string;
    content: string;
    excerpt?: string;
    featured_image?: string;
    category?: string;
    tags?: string[];
    country?: string;
    language?: string;
    is_breaking?: boolean;
    breaking_priority?: number;
    breaking_expiry_at?: Date | null;
    is_verified?: boolean;
    is_sponsored?: boolean;
    is_featured?: boolean;
    is_premium?: boolean;
    status?: string;
    seo_title?: string;
    seo_description?: string;
    verified_source_id?: string | null;
  }) {
    const baseSlug = slugify(data.title);
    let slug = baseSlug;
    let n = 0;
    while (await prisma.newsArticle.findUnique({ where: { slug } })) {
      n++;
      slug = `${baseSlug}-${n}`;
    }
    const content = sanitizeHtmlFragment(data.content);
    const readingTime = content ? Math.max(1, Math.ceil((content.replace(/<[^>]+>/g, '').length || 0) / 1200)) : null;
    const article = await prisma.newsArticle.create({
      data: {
        author_id: authorId,
        title: data.title,
        slug,
        subtitle: data.subtitle ?? null,
        content,
        excerpt: data.excerpt ?? null,
        featured_image: data.featured_image ?? null,
        category: data.category ?? null,
        tags: (data.tags ?? []) as any,
        country: data.country ?? null,
        language: data.language ?? 'FR',
        is_breaking: data.is_breaking ?? false,
        breaking_priority: data.breaking_priority ?? null,
        breaking_expiry_at: data.breaking_expiry_at ?? null,
        is_verified: data.is_verified ?? false,
        is_sponsored: data.is_sponsored ?? false,
        is_featured: data.is_featured ?? false,
        is_premium: data.is_premium ?? false,
        status: data.status ?? 'draft',
        seo_title: data.seo_title ?? null,
        seo_description: data.seo_description ?? null,
        verified_source_id: data.verified_source_id ?? null,
        reading_time: readingTime,
        is_published: false,
      },
    });
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { full_name: true, profile_image: true },
    });
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        author_name: author?.full_name ?? null,
        author_avatar: author?.profile_image ?? null,
      },
    });
    logger.info('News article created', { articleId: article.id, authorId });
    return prisma.newsArticle.findUnique({
      where: { id: article.id },
      include: { author: { select: { id: true, full_name: true, profile_image: true } }, verified_source: true },
    });
  }

  /** Mise à jour article */
  async update(articleId: string, userId: string, isAdmin: boolean, data: Partial<{
    title: string;
    subtitle: string;
    content: string;
    excerpt: string;
    featured_image: string;
    category: string;
    tags: string[];
    country: string;
    language: string;
    is_breaking: boolean;
    breaking_priority: number;
    breaking_expiry_at: Date | null;
    is_verified: boolean;
    is_sponsored: boolean;
    is_featured: boolean;
    is_premium: boolean;
    status: string;
    seo_title: string;
    seo_description: string;
    verified_source_id: string | null;
  }>) {
    const article = await prisma.newsArticle.findUnique({ where: { id: articleId } });
    if (!article) throw new Error('Article introuvable');
    if (!isAdmin && article.author_id !== userId) throw new Error('Non autorisé');

    if (data.content !== undefined) data.content = sanitizeHtmlFragment(data.content) as any;
    const update: any = { ...data };
    if (data.title && data.title !== article.title) {
      const baseSlug = slugify(data.title);
      let slug = baseSlug;
      let n = 0;
      while (await prisma.newsArticle.findFirst({ where: { slug, id: { not: articleId } } })) {
        n++;
        slug = `${baseSlug}-${n}`;
      }
      update.slug = slug;
    }
    if (data.content !== undefined) {
      update.reading_time = Math.max(1, Math.ceil((data.content.replace(/<[^>]+>/g, '').length || 0) / 1200));
    }
    await prisma.newsArticle.update({ where: { id: articleId }, data: update });
    return prisma.newsArticle.findUnique({
      where: { id: articleId },
      include: { author: { select: { id: true, full_name: true, profile_image: true } }, verified_source: true },
    });
  }

  /** Publier / Mettre en review / Archiver */
  async setStatus(articleId: string, userId: string, isAdmin: boolean, status: 'draft' | 'review' | 'published' | 'archived') {
    const article = await prisma.newsArticle.findUnique({ where: { id: articleId } });
    if (!article) throw new Error('Article introuvable');
    if (!isAdmin && article.author_id !== userId) throw new Error('Non autorisé');

    const data: any = { status };
    if (status === 'published') {
      data.is_published = true;
      data.published_at = new Date();
    } else if (status === 'draft' || status === 'archived') {
      data.is_published = false;
    }
    await prisma.newsArticle.update({ where: { id: articleId }, data });
    return prisma.newsArticle.findUnique({
      where: { id: articleId },
      include: { author: { select: { id: true, full_name: true, profile_image: true } }, verified_source: true },
    });
  }

  /** Verified sources */
  async listVerifiedSources() {
    return prisma.verifiedSource.findMany({ orderBy: { name: 'asc' } });
  }

  async createVerifiedSource(data: { name: string; logo?: string; website?: string; trust_score?: number }) {
    return prisma.verifiedSource.create({ data });
  }

  /** Abonnement premium */
  async createPremiumSubscription(userId: string, plan: string, expiresAt: Date) {
    return prisma.newsPremiumSubscription.create({
      data: { user_id: userId, plan, expires_at: expiresAt },
    });
  }

  /** Like par utilisateur (pour affichage) */
  async getLikeStatus(articleId: string, userId: string | null) {
    if (!userId) return { liked: false };
    const like = await prisma.articleLike.findUnique({
      where: { article_id_user_id: { article_id: articleId, user_id: userId } },
    });
    return { liked: !!like };
  }

  /** Analytics par article (auteur ou admin) */
  async getArticleAnalytics(articleId: string, userId: string, isAdmin: boolean) {
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { id: true, author_id: true, title: true, views: true, likes_count: true, comments_count: true, shares_count: true, is_sponsored: true, published_at: true },
    });
    if (!article) throw new Error('Article introuvable');
    if (!isAdmin && article.author_id !== userId) throw new Error('Non autorisé');
    const viewsLast7 = await prisma.articleView.count({
      where: { article_id: articleId, viewed_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });
    return {
      article: { id: article.id, title: article.title, is_sponsored: article.is_sponsored, published_at: article.published_at },
      views: article.views,
      viewsLast7Days: viewsLast7,
      likes: article.likes_count,
      comments: article.comments_count,
      shares: article.shares_count,
    };
  }

  /** Liste des articles de l'auteur (ou tous si admin) */
  async listMyArticles(userId: string, isAdmin: boolean, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = isAdmin ? {} : { author_id: userId };
    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        include: {
          author: { select: { id: true, full_name: true, profile_image: true } },
          verified_source: { select: { id: true, name: true, logo: true } },
        },
      }),
      prisma.newsArticle.count({ where }),
    ]);
    return {
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

const newsService = new NewsService();
export default newsService;
