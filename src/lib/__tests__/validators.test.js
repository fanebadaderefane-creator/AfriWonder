import { describe, it, expect } from 'vitest';
import { userSchema, productSchema, paymentSchema, videoSchema, orderSchema, validate } from '../validators';

describe('Validators', () => {
  it('should rethrow non-ZodError from validate', () => {
    const fakeSchema = { parse: () => { throw new Error('non-zod'); } };
    expect(() => validate({}, fakeSchema)).toThrow('non-zod');
  });

  describe('userSchema', () => {
    it('should validate correct user data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };
      
      const result = validate(data, userSchema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
        username: 'testuser',
      };
      
      const result = validate(data, userSchema);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].path).toBe('email');
    });

    it('should reject short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'short',
        username: 'testuser',
      };
      
      const result = validate(data, userSchema);
      expect(result.success).toBe(false);
      expect(result.errors[0].path).toBe('password');
    });

    it('should reject short username', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        username: 'ab',
      };
      
      const result = validate(data, userSchema);
      expect(result.success).toBe(false);
      expect(result.errors[0].path).toBe('username');
    });
  });

  describe('productSchema', () => {
    it('should validate correct product data', () => {
      const data = {
        name: 'Test Product',
        description: 'This is a test product description',
        price: 29.99,
        category: 'electronics',
        stock: 10,
      };
      
      const result = validate(data, productSchema);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const data = {
        name: 'Test Product',
        description: 'This is a test product description',
        price: -10,
        category: 'electronics',
        stock: 10,
      };
      
      const result = validate(data, productSchema);
      expect(result.success).toBe(false);
    });

    it('should reject negative stock', () => {
      const data = {
        name: 'Test Product',
        description: 'This is a test product description',
        price: 29.99,
        category: 'electronics',
        stock: -1,
      };
      
      const result = validate(data, productSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('paymentSchema', () => {
    it('should validate correct payment data', () => {
      const data = {
        amount: 100.50,
        currency: 'XOF',
        orderId: 'order123',
      };
      
      const result = validate(data, paymentSchema);
      expect(result.success).toBe(true);
    });

    it('should reject invalid currency code', () => {
      const data = {
        amount: 100.50,
        currency: 'XX',
        orderId: 'order123',
      };
      
      const result = validate(data, paymentSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('videoSchema', () => {
    it('should validate correct video data', () => {
      const data = {
        title: 'Test Video',
        description: 'This is a test video description',
        category: 'entertainment',
        visibility: 'public',
      };
      
      const result = validate(data, videoSchema);
      expect(result.success).toBe(true);
    });

    it('should reject invalid visibility', () => {
      const data = {
        title: 'Test Video',
        description: 'This is a test video description',
        category: 'entertainment',
        visibility: 'invalid',
      };
      
      const result = validate(data, videoSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('orderSchema', () => {
    it('should validate correct order data', () => {
      const data = {
        items: [
          {
            productId: 'prod123',
            quantity: 2,
            price: 29.99,
          },
        ],
        shippingAddress: '123 Main Street, City, Country',
        paymentMethod: 'stripe',
      };
      
      const result = validate(data, orderSchema);
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const data = {
        items: [],
        shippingAddress: '123 Main Street, City, Country',
        paymentMethod: 'stripe',
      };
      
      const result = validate(data, orderSchema);
      expect(result.success).toBe(false);
    });
  });
});

