import prisma from '../config/database.js';

class ProductQuestionService {
  async listByProduct(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [questions, total] = await Promise.all([
      prisma.productQuestion.findMany({
        where: { product_id: productId },
        include: {
          user: {
            select: { id: true, full_name: true, username: true, profile_image: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productQuestion.count({ where: { product_id: productId } }),
    ]);

    return {
      questions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(productId: string, userId: string, question: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, seller_id: true },
    });
    if (!product) throw new Error('Produit non trouvé');

    return prisma.productQuestion.create({
      data: { product_id: productId, user_id: userId, question },
      include: {
        user: {
          select: { id: true, full_name: true, username: true },
        },
      },
    });
  }

  async answer(questionId: string, sellerId: string, answer: string) {
    const q = await prisma.productQuestion.findUnique({
      where: { id: questionId },
      include: { product: { select: { seller_id: true } } },
    });
    if (!q) throw new Error('Question non trouvée');
    if (q.product.seller_id !== sellerId) throw new Error('Non autorisé');

    return prisma.productQuestion.update({
      where: { id: questionId },
      data: { answer, answered_at: new Date() },
      include: {
        user: { select: { full_name: true } },
      },
    });
  }
}

export const productQuestionService = new ProductQuestionService();
export default productQuestionService;
