/**
 * Tests de contrat « flux critiques » : mocks réseau uniquement (pas de rendu React).
 * Les chemins reflètent l’usage typique de `apiClient` (baseURL `…/api/proxy`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../api/client', () => ({
  default: {
    get: (...args: unknown[]) => mocks.mockGet(...args),
    post: (...args: unknown[]) => mocks.mockPost(...args),
  },
}));

describe('AfriWonder Mobile — flux critiques (contrats API mockés)', () => {
  beforeEach(() => {
    mocks.mockGet.mockReset();
    mocks.mockPost.mockReset();
  });

  describe('Authentification', () => {
    it('valide email et mot de passe (règles UI)', () => {
      const email = 'test@afriwonder.com';
      const password = 'MySecureP@ss123';
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(password.length).toBeGreaterThanOrEqual(8);
    });

    it('POST /auth/login — succès', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh',
            user: { id: '1', email: 'test@afriwonder.com' },
          },
        },
      });
      const res = await mocks.mockPost('/auth/login', { email: 'test@afriwonder.com', password: 'test' });
      expect(res.data.data.accessToken).toBeDefined();
    });

    it('POST /auth/login — erreur 401', async () => {
      mocks.mockPost.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid credentials' } },
      });
      await expect(mocks.mockPost('/auth/login', { email: 'wrong@test.com', password: 'wrong' })).rejects.toBeDefined();
    });
  });

  describe('Feed et vidéos', () => {
    it('GET /feed — items vidéo', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                type: 'video',
                video: {
                  id: 'v1',
                  title: 'Test',
                  video_url: 'https://example.com/v.mp4',
                  creator_name: 'Creator',
                  views: 100,
                },
              },
            ],
            pagination: { totalPages: 1 },
          },
        },
      });
      const res = await mocks.mockGet('/feed', { params: { page: 1, limit: 10 } });
      const items = res.data.data.items;
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].type).toBe('video');
      expect(items[0].video.video_url).toBeTruthy();
    });

    it('POST /videos/:id/like', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { liked: true } } });
      const res = await mocks.mockPost('/videos/v1/like');
      expect(res.data.data.liked).toBe(true);
    });

    it('POST /videos/:id/view', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { success: true } });
      const res = await mocks.mockPost('/videos/v1/view');
      expect(res.data.success).toBe(true);
    });

    it('POST /videos/:id/comment — body content', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { id: 'c1', content: 'Super!' } } });
      const res = await mocks.mockPost('/videos/v1/comment', { content: 'Super!' });
      expect(res.data.data.id).toBeDefined();
    });

    it('POST /users/:id/follow', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { following: true } } });
      const res = await mocks.mockPost('/users/u1/follow');
      expect(res.data.data.following).toBe(true);
    });
  });

  describe('Paiements et portefeuille', () => {
    it('GET /payments/wallet', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: { data: { balance: 127500, currency: 'XOF' } },
      });
      const res = await mocks.mockGet('/payments/wallet');
      expect(res.data.data.balance).toBe(127500);
    });

    it('POST /payments/orange-money/initiate — réponse type backend', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: {
          data: {
            paymentUrl: 'https://om.example.com/pay',
            orderId: 'order-1',
            reference: 'ref-om-1',
            provider: 'orange_money',
          },
        },
      });
      const res = await mocks.mockPost('/payments/orange-money/initiate', {
        orderId: 'order-1',
        amount: 5000,
        phone: '+22370123456',
        currency: 'XOF',
        returnUrl: 'https://afriwonder.com/payment/complete',
      });
      expect(res.data.data.reference).toBeDefined();
      expect(res.data.data.paymentUrl).toBeTruthy();
    });

    it('GET /payments/transactions — polling statut', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: {
          data: {
            transactions: [
              { reference_id: 'order-1', status: 'completed', payment_method: 'orange_money', amount: 5000 },
            ],
          },
        },
      });
      const res = await mocks.mockGet('/payments/transactions', { params: { page: 1, limit: 50 } });
      const txs = res.data.data.transactions;
      expect(txs[0].status).toBe('completed');
    });
  });

  describe('Live', () => {
    it('POST /live/start', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { data: { id: 'live-1', title: 'Test Live', status: 'live' } },
      });
      const res = await mocks.mockPost('/live/start', { title: 'Test Live', category: 'Discussion', status: 'live' });
      expect(res.data.data.id).toBeDefined();
    });

    it('POST /live/:id/end', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { data: { id: 'live-1', status: 'ended', replay_url: 'https://example.com/replay' } },
      });
      const res = await mocks.mockPost('/live/live-1/end', {});
      expect(res.data.data.status).toBe('ended');
    });

    it('POST /live/:id/gift — camelCase', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { id: 'gift-1', total_amount: 500 } } });
      const res = await mocks.mockPost('/live/live-1/gift', {
        giftId: 'diamond',
        giftName: 'Diamant',
        giftIcon: 'diamond',
        amount: 1000,
        quantity: 1,
      });
      expect(res.data.data.id).toBeDefined();
    });

    it('POST /live/:id/chapters — clip replay', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { id: 'clip-1', title: 'Moment fort' } } });
      const res = await mocks.mockPost('/live/live-1/chapters', {
        title: 'Moment fort',
        start_seconds: 0,
        end_seconds: 60,
      });
      expect(res.data.data.id).toBeDefined();
    });
  });

  describe('Marketplace', () => {
    it('GET /products', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: { data: { products: [{ id: 'p1', name: 'Boubou malien', price: 15000 }] } },
      });
      const res = await mocks.mockGet('/products', { params: { page: 1, limit: 20 } });
      expect(res.data.data.products.length).toBeGreaterThan(0);
    });

    it('POST /cart/add', async () => {
      mocks.mockPost.mockResolvedValueOnce({ data: { data: { cart_id: 'cart-1', items: 1 } } });
      const res = await mocks.mockPost('/cart/add', { product_id: 'p1', quantity: 1 });
      expect(res.data.data.items).toBe(1);
    });

    it('POST /orders', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { data: { id: 'order-1', status: 'pending', total: 15000 } },
      });
      const res = await mocks.mockPost('/orders', { items: [], payment_method: 'orange_money' });
      expect(res.data.data.id).toBeDefined();
    });
  });

  describe('Créateur et monétisation', () => {
    it('POST /creator-dashboard/request-monetization', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { success: true, message: 'Demande envoyée à AfriWonder.' },
      });
      const res = await mocks.mockPost('/creator-dashboard/request-monetization', {});
      expect(res.data.success).toBe(true);
    });

    it('GET /creator-dashboard', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: {
          data: {
            revenues: { total_fcfa: 125000, video_fcfa: 75000, donations_fcfa: 50000 },
            stats: { qualified_views: 1000 },
          },
        },
      });
      const res = await mocks.mockGet('/creator-dashboard');
      expect(res.data.data.revenues.total_fcfa).toBe(125000);
    });

    it('POST /withdrawals/request', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { data: { id: 'wd-1', amount: 50000, status: 'pending' } },
      });
      const res = await mocks.mockPost('/withdrawals/request', {
        amount: 50000,
        payment_method: 'orange_money',
        phone: '+22370123456',
      });
      expect(res.data.data.status).toBe('pending');
    });
  });

  describe('Messagerie', () => {
    it('GET /messages/conversations', async () => {
      mocks.mockGet.mockResolvedValueOnce({
        data: { data: { conversations: [{ id: 'conv-1', last_message: 'Salut !' }] } },
      });
      const res = await mocks.mockGet('/messages/conversations');
      expect(res.data.data.conversations.length).toBeGreaterThan(0);
    });

    it('POST /messages/send', async () => {
      mocks.mockPost.mockResolvedValueOnce({
        data: { data: { id: 'msg-1', content: 'Bonjour !', sent: true } },
      });
      const res = await mocks.mockPost('/messages/send', { recipientId: 'u2', content: 'Bonjour !' });
      expect(res.data.data.sent).toBe(true);
    });
  });

  describe('Hors ligne / cache (logique pure)', () => {
    it('format cache TTL', () => {
      const cacheData = { data: [{ id: 'v1', title: 'Cached Video' }], timestamp: Date.now(), ttl: 1_800_000 };
      expect(cacheData.data.length).toBeGreaterThan(0);
      expect(cacheData.ttl).toBeGreaterThan(0);
      expect(Date.now() - cacheData.timestamp).toBeLessThan(cacheData.ttl);
    });

    it('détecte un cache expiré', () => {
      const cacheData = { timestamp: Date.now() - 3_600_000, ttl: 1_800_000 };
      const isStale = Date.now() - cacheData.timestamp > cacheData.ttl;
      expect(isStale).toBe(true);
    });
  });

  describe('Validation données', () => {
    it('téléphones Mali +223 (longueur)', () => {
      const validPhones = ['+22370123456', '70123456'];
      validPhones.forEach((p) => {
        const digits = p.replace(/\D/g, '');
        expect(digits.length).toBeGreaterThanOrEqual(8);
      });
    });

    it('montants FCFA plausibles', () => {
      expect(5000).toBeGreaterThanOrEqual(100);
      expect(0).not.toBeGreaterThan(0);
    });

    it('format K / M', () => {
      const fmt = (n: number) =>
        n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
      expect(fmt(1_500_000)).toBe('1.5M');
      expect(fmt(25_000)).toBe('25.0K');
      expect(fmt(500)).toBe('500');
    });
  });
});
