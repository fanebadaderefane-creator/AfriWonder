import { z } from 'zod';

/**
 * Validation schemas using Zod
 * Used for form validation and API input validation
 */

// User validation
export const userSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
});

// Product validation
export const productSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  price: z.number().positive('Le prix doit être positif'),
  category: z.string().min(1, 'La catégorie est requise'),
  stock: z.number().int().min(0, 'Le stock ne peut pas être négatif'),
});

// Payment validation
export const paymentSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
  currency: z.string().length(3, 'Code devise invalide'),
  orderId: z.string().min(1, 'ID de commande requis'),
});

// Video validation
export const videoSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre est trop long'),
  description: z.string().max(5000, 'La description est trop longue'),
  category: z.string().min(1, 'La catégorie est requise'),
  visibility: z.enum(['public', 'prive', 'abonnes'], {
    errorMap: () => ({ message: 'Visibilité invalide' }),
  }),
});

// Order validation
export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, 'ID produit requis'),
    quantity: z.number().int().positive('Quantité invalide'),
    price: z.number().positive('Prix invalide'),
  })).min(1, 'Au moins un article requis'),
  shippingAddress: z.string().min(10, 'Adresse de livraison requise'),
  paymentMethod: z.enum(['stripe', 'orange_money', 'mobile_money'], {
    errorMap: () => ({ message: 'Méthode de paiement invalide' }),
  }),
});

// Export validation helper
export function validate(data, schema) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return {
        success: false,
        errors: _error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    throw _error;
  }
}

