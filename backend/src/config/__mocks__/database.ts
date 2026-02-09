/**
 * Mock de database.ts pour les tests Jest
 * Ce fichier sera automatiquement utilisé quand jest.mock('../config/database.js') est appelé
 */
import { jest } from '@jest/globals';

const mockPrisma = {
  cart: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  inventoryLog: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  sellerWallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

export default mockPrisma;
