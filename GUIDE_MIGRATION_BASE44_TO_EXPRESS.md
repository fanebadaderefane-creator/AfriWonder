# 🚀 Guide Complet : Migration Base44 → Backend Express
## Devenez 100% Indépendant et Gardez Votre Belle UI

---

## 🎯 OBJECTIF

**Passer de** : Frontend → Base44 (externe) 🔴  
**À** : Frontend → Votre Backend Express (propriétaire) ✅

**Temps estimé** : 7-10 jours  
**Difficulté** : Moyenne  
**Impact UI** : ❌ **AUCUN** (tout reste pareil visuellement)

---

## ✅ CE QUI NE CHANGE PAS (Vous Gardez Tout Ça !)

### Votre UI Reste 100% Identique

```javascript
// ✅ VOS COMPOSANTS RESTENT IDENTIQUES
<Button>Connexion</Button>  // ✅ Pareil
<Input placeholder="Email" />  // ✅ Pareil
<Card>...</Card>  // ✅ Pareil

// ✅ VOS COULEURS RESTENT IDENTIQUES
bg-primary  // ✅ Pareil
text-blue-500  // ✅ Pareil
hover:bg-gray-100  // ✅ Pareil

// ✅ VOTRE DESIGN SYSTEM RESTE IDENTIQUE
- Tailwind CSS  // ✅ Pareil
- Radix UI  // ✅ Pareil
- Shadcn/ui  // ✅ Pareil
- Framer Motion  // ✅ Pareil

// ✅ VOTRE ARCHITECTURE RESTE IDENTIQUE
src/
  components/  // ✅ Pareil
  pages/  // ✅ Pareil
  hooks/  // ✅ Pareil
  lib/  // ✅ Pareil
```

**Tout votre travail UI reste intact !** 🎨

---

## 🔄 CE QUI CHANGE (Seulement la Communication)

### Avant (Base44)

```javascript
// ❌ AVANT : Vous appelez Base44
import { base44 } from '@/api/base44Client';

const user = await base44.auth.me();
const videos = await base44.entities.Video.list();
const product = await base44.entities.Product.create(data);
```

### Après (Votre Backend)

```javascript
// ✅ APRÈS : Vous appelez VOTRE backend
import { api } from '@/api/expressClient';  // Nouveau fichier

const user = await api.auth.me();
const videos = await api.videos.list();
const product = await api.products.create(data);
```

**C'est tout !** Même syntaxe, juste l'import qui change.

---

## 📋 PLAN DE MIGRATION EN 7 ÉTAPES

### ✅ Phase 1 : Préparation (1 jour)

#### Étape 1 : Créer le Client API Express

**Créer** : `src/api/expressClient.js`

```javascript
// src/api/expressClient.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Instance axios avec config
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le JWT
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer le refresh token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si 401 et pas déjà retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('access_token', data.data.accessToken);
        localStorage.setItem('refresh_token', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Client avec même syntaxe que Base44
export const api = {
  // AUTH
  auth: {
    async login(email, password) {
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      localStorage.setItem('access_token', data.data.accessToken);
      localStorage.setItem('refresh_token', data.data.refreshToken);
      return data.data.user;
    },

    async register(userData) {
      const { data } = await axiosInstance.post('/auth/register', userData);
      localStorage.setItem('access_token', data.data.accessToken);
      localStorage.setItem('refresh_token', data.data.refreshToken);
      return data.data.user;
    },

    async me() {
      const { data } = await axiosInstance.get('/auth/me');
      return data.data;
    },

    async logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
  },

  // VIDEOS
  videos: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/videos', { params });
      return data.data;
    },

    async getById(id) {
      const { data } = await axiosInstance.get(`/videos/${id}`);
      return data.data;
    },

    async create(videoData) {
      const { data } = await axiosInstance.post('/videos', videoData);
      return data.data;
    },

    async update(id, videoData) {
      const { data } = await axiosInstance.put(`/videos/${id}`, videoData);
      return data.data;
    },

    async delete(id) {
      await axiosInstance.delete(`/videos/${id}`);
    },

    async like(id) {
      const { data } = await axiosInstance.post(`/videos/${id}/like`);
      return data.data;
    },

    async comment(id, content, parentId = null) {
      const { data } = await axiosInstance.post(`/videos/${id}/comment`, {
        content,
        parentId,
      });
      return data.data;
    },

    async getComments(id, params = {}) {
      const { data } = await axiosInstance.get(`/videos/${id}/comments`, { params });
      return data.data;
    },
  },

  // USERS
  users: {
    async getById(id) {
      const { data } = await axiosInstance.get(`/users/${id}`);
      return data.data;
    },

    async update(id, userData) {
      const { data } = await axiosInstance.put(`/users/${id}`, userData);
      return data.data;
    },

    async getFollowers(id, params = {}) {
      const { data } = await axiosInstance.get(`/users/${id}/followers`, { params });
      return data.data;
    },

    async getFollowing(id, params = {}) {
      const { data } = await axiosInstance.get(`/users/${id}/following`, { params });
      return data.data;
    },

    async toggleFollow(id) {
      const { data } = await axiosInstance.post(`/users/${id}/follow`);
      return data.data;
    },

    async getStats(id) {
      const { data } = await axiosInstance.get(`/users/${id}/stats`);
      return data.data;
    },
  },

  // PRODUCTS
  products: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/products', { params });
      return data.data;
    },

    async getById(id) {
      const { data } = await axiosInstance.get(`/products/${id}`);
      return data.data;
    },

    async create(productData) {
      const { data } = await axiosInstance.post('/products', productData);
      return data.data;
    },

    async update(id, productData) {
      const { data } = await axiosInstance.put(`/products/${id}`, productData);
      return data.data;
    },

    async delete(id) {
      await axiosInstance.delete(`/products/${id}`);
    },

    async updateStock(id, quantity) {
      const { data } = await axiosInstance.put(`/products/${id}/stock`, { quantity });
      return data.data;
    },
  },

  // ORDERS
  orders: {
    async list(params = {}) {
      const { data } = await axiosInstance.get('/orders', { params });
      return data.data;
    },

    async getById(id) {
      const { data } = await axiosInstance.get(`/orders/${id}`);
      return data.data;
    },

    async create(orderData) {
      const { data } = await axiosInstance.post('/orders', orderData);
      return data.data;
    },

    async updateStatus(id, status) {
      const { data } = await axiosInstance.put(`/orders/${id}/status`, { status });
      return data.data;
    },

    async cancel(id) {
      const { data } = await axiosInstance.post(`/orders/${id}/cancel`);
      return data.data;
    },
  },

  // PAYMENTS
  payments: {
    async createStripeCheckout(orderId, items, successUrl, cancelUrl) {
      const { data } = await axiosInstance.post('/payments/stripe/checkout', {
        orderId,
        items,
        successUrl,
        cancelUrl,
      });
      return data.data;
    },

    async verifyStripePayment(sessionId) {
      const { data } = await axiosInstance.post('/payments/stripe/verify', { sessionId });
      return data.data;
    },

    async initiateOrangeMoney(orderId, amount, phone, returnUrl) {
      const { data } = await axiosInstance.post('/payments/orange-money/initiate', {
        orderId,
        amount,
        phone,
        returnUrl,
      });
      return data.data;
    },

    async verifyOrangeMoney(orderId, status, payToken) {
      const { data } = await axiosInstance.post('/payments/orange-money/verify', {
        orderId,
        status,
        payToken,
      });
      return data.data;
    },

    async getWallet() {
      const { data } = await axiosInstance.get('/payments/wallet');
      return data.data;
    },

    async addToWallet(amount, description) {
      const { data } = await axiosInstance.post('/payments/wallet/add', {
        amount,
        description,
      });
      return data.data;
    },

    async withdrawFromWallet(amount, description) {
      const { data } = await axiosInstance.post('/payments/wallet/withdraw', {
        amount,
        description,
      });
      return data.data;
    },

    async getTransactions(params = {}) {
      const { data } = await axiosInstance.get('/payments/transactions', { params });
      return data.data;
    },
  },
};

export default api;
```

#### Étape 2 : Mettre à Jour .env.local

```env
# .env.local

# Backend API (NOUVEAU)
VITE_API_URL=http://localhost:3000/api

# Base44 (ANCIEN - à garder temporairement)
VITE_BASE44_APP_ID=697bc0a026fbb0821670a468
VITE_BASE44_APP_BASE_URL=https://app.base44.com/apps/697bc0a026fbb0821670a468

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Orange Money
VITE_ORANGE_MERCHANT_ID=7701901162
```

---

### ✅ Phase 2 : Migrer l'Authentification (2 jours)

#### Étape 3 : Adapter AuthContext

**Fichier** : `src/lib/AuthContext.jsx`

```javascript
// AVANT
import { base44 } from '@/api/base44Client';  // ❌

// APRÈS
import { api } from '@/api/expressClient';  // ✅

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoadingAuth(true);
      
      // ✅ CHANGEMENT ICI : api au lieu de base44
      const currentUser = await api.auth.me();
      
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      // ✅ CHANGEMENT ICI
      const user = await api.auth.login(email, password);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData) => {
    try {
      // ✅ CHANGEMENT ICI
      const user = await api.auth.register(userData);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    // ✅ CHANGEMENT ICI
    api.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      login,
      register,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Tester l'Authentification

```bash
# 1. Démarrer le backend
cd backend
npm run dev  # Port 3000

# 2. Dans un autre terminal, démarrer le frontend
cd ..
npm run dev  # Port 5173

# 3. Tester dans le navigateur
http://localhost:5173
```

**Tester** :
- ✅ Inscription
- ✅ Connexion
- ✅ Logout
- ✅ Refresh (actualiser la page)

---

### ✅ Phase 3 : Migrer les Pages (4-6 jours)

#### Étape 4 : Migrer Page par Page

**Stratégie** : Commencer par les pages les plus utilisées

##### Exemple : Page Vidéos

**Fichier** : `src/pages/Home.jsx` (ou votre page de vidéos)

```javascript
// AVANT
import { base44 } from '@/api/base44Client';  // ❌

// APRÈS
import { api } from '@/api/expressClient';  // ✅

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // ✅ CHANGEMENT ICI : api.videos au lieu de base44.entities.Video
      const result = await api.videos.list({
        page: 1,
        limit: 20,
      });
      
      setVideos(result.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
      toast.error('Erreur de chargement des vidéos');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (videoId) => {
    try {
      // ✅ CHANGEMENT ICI
      await api.videos.like(videoId);
      
      // Mettre à jour l'UI
      setVideos(videos.map(v => 
        v.id === videoId 
          ? { ...v, likes: v.likes + 1, isLiked: !v.isLiked }
          : v
      ));
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  };

  // ✅ AUCUN CHANGEMENT ICI - UI identique !
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard 
          key={video.id}
          video={video}
          onLike={handleLike}
        />
      ))}
    </div>
  );
}
```

##### Exemple : Page Marketplace

**Fichier** : `src/pages/Marketplace.jsx`

```javascript
// AVANT
import { base44 } from '@/api/base44Client';  // ❌

// APRÈS
import { api } from '@/api/expressClient';  // ✅

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
  });

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadProducts = async () => {
    try {
      // ✅ CHANGEMENT ICI
      const result = await api.products.list({
        page: 1,
        limit: 20,
        category: filters.category,
        search: filters.search,
      });
      
      setProducts(result.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  // ✅ UI reste identique !
  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />
      <ProductGrid products={products} />
    </div>
  );
}
```

##### Exemple : Page Panier & Checkout

**Fichier** : `src/pages/Checkout.jsx`

```javascript
// AVANT
import { base44 } from '@/api/base44Client';  // ❌

// APRÈS
import { api } from '@/api/expressClient';  // ✅

export default function Checkout() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (paymentMethod) => {
    try {
      setLoading(true);

      // 1. Créer la commande
      // ✅ CHANGEMENT ICI
      const order = await api.orders.create({
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        total_amount: calculateTotal(),
      });

      // 2. Rediriger vers le paiement
      if (paymentMethod === 'stripe') {
        // ✅ CHANGEMENT ICI
        const { url } = await api.payments.createStripeCheckout(
          order.id,
          cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          })),
          `${window.location.origin}/payment/success`,
          `${window.location.origin}/payment/cancel`
        );
        window.location.href = url;
      } else if (paymentMethod === 'orange_money') {
        // ✅ CHANGEMENT ICI
        const { paymentUrl } = await api.payments.initiateOrangeMoney(
          order.id,
          calculateTotal(),
          phoneNumber,
          `${window.location.origin}/payment/callback`
        );
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  // ✅ UI reste identique !
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Finaliser la commande</h1>
      <CartSummary items={cart} />
      <PaymentMethodSelector onCheckout={handleCheckout} />
    </div>
  );
}
```

#### Ordre de Migration Recommandé

```
Priorité 1 (Critique) :
1. ✅ Authentication (AuthContext)
2. ✅ Home/Videos
3. ✅ Profile
4. ✅ Marketplace

Priorité 2 (Important) :
5. ✅ Checkout/Orders
6. ✅ Wallet
7. ✅ Notifications
8. ✅ Search

Priorité 3 (Nice to have) :
9. ✅ Live Streaming
10. ✅ Gamification
11. ✅ Communities
12. ✅ Autres pages
```

---

### ✅ Phase 4 : Migrer les Composants Réutilisables (1 jour)

#### Composants à Migrer

**Fichier** : `src/components/marketplace/ReturnForm.jsx`

```javascript
// AVANT
import { base44 } from '@/api/base44Client';  // ❌
await base44.entities.Return.create({...});  // ❌

// APRÈS
import { api } from '@/api/expressClient';  // ✅
// Note : Vous devrez ajouter l'endpoint returns dans expressClient.js
await api.returns.create({...});  // ✅
```

**Fichier** : `src/components/video/VideoCard.jsx`

Généralement, les composants UI purs n'ont **pas besoin de changement**.  
Seuls les composants qui font des appels API doivent être migrés.

---

### ✅ Phase 5 : Upload de Fichiers (1 jour)

#### Backend : Ajouter Route Upload

**Fichier** : `backend/src/routes/upload.routes.ts`

```typescript
import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configuration S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configuration Multer (mémoire)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// POST /api/upload/image
router.post('/image', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `images/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/images/${fileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/video
router.post('/video', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `videos/${fileName}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/videos/${fileName}`;

    res.json({
      success: true,
      data: {
        file_url: fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Fichier** : `backend/src/index.ts`

```typescript
// Ajouter la route upload
import uploadRoutes from './routes/upload.routes.js';

app.use('/api/upload', uploadRoutes);
```

#### Frontend : Utiliser l'Upload

**Ajouter dans** : `src/api/expressClient.js`

```javascript
export const api = {
  // ... autres méthodes

  // UPLOAD
  upload: {
    async image(file) {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axiosInstance.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data.data;
    },

    async video(file, onProgress) {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axiosInstance.post('/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress?.(percentCompleted);
        },
      });
      return data.data;
    },
  },
};
```

**Utilisation** :

```javascript
// Dans vos composants
const handleUpload = async (file) => {
  try {
    const { file_url } = await api.upload.image(file);
    console.log('Image uploaded:', file_url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

---

### ✅ Phase 6 : WebSocket (1 jour)

#### Backend WebSocket déjà configuré ✅

Votre backend a déjà Socket.io configuré dans `backend/src/index.ts`.

#### Frontend : Adapter le Hook WebSocket

**Fichier** : `src/components/realtime/useWebSocket.jsx`

```javascript
// AVANT
const WS_URL = "wss://api.africonnect.app/ws";  // ❌ Base44

// APRÈS
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000";  // ✅ Votre backend

// Le reste du hook peut rester identique !
export function useWebSocket(userId) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // ✅ Se connecter à votre backend Socket.io
    const ws = new WebSocket(`${WS_URL}?userId=${userId}`);
    
    // ... reste du code identique
  }, [userId]);

  return { isConnected, messages, send };
}
```

**Meilleure approche : Socket.io Client**

```bash
npm install socket.io-client
```

```javascript
// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function useSocket(userId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Créer connexion Socket.io
    const socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      socket.emit('user:join', userId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  return { isConnected, emit, on };
}
```

---

### ✅ Phase 7 : Tests & Validation (1 jour)

#### Checklist de Tests

```
Authentification :
- [ ] ✅ Register nouveau utilisateur
- [ ] ✅ Login utilisateur existant
- [ ] ✅ Logout
- [ ] ✅ Refresh token automatique
- [ ] ✅ Redirection si non authentifié

Vidéos :
- [ ] ✅ Liste des vidéos
- [ ] ✅ Détails vidéo
- [ ] ✅ Upload vidéo
- [ ] ✅ Like vidéo
- [ ] ✅ Commenter vidéo
- [ ] ✅ Voir commentaires

Marketplace :
- [ ] ✅ Liste produits
- [ ] ✅ Détails produit
- [ ] ✅ Ajouter au panier
- [ ] ✅ Checkout
- [ ] ✅ Paiement Stripe (mode test)
- [ ] ✅ Paiement Orange Money (mode test)

Profile :
- [ ] ✅ Voir profil
- [ ] ✅ Modifier profil
- [ ] ✅ Follow/Unfollow
- [ ] ✅ Voir statistiques

Wallet :
- [ ] ✅ Voir solde
- [ ] ✅ Ajouter fonds
- [ ] ✅ Retirer fonds
- [ ] ✅ Historique transactions

WebSocket :
- [ ] ✅ Connexion établie
- [ ] ✅ Notifications temps réel
- [ ] ✅ Chat en direct
- [ ] ✅ Live streaming
```

---

## 🎨 CONFIRMATION : VOTRE UI RESTE IDENTIQUE

### Exemples Concrets

#### Avant et Après : Page de Connexion

```jsx
// ✅ IDENTIQUE - Aucun changement visuel !

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);  // ✅ Même fonction
  };

  // ✅ UI 100% IDENTIQUE
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Résultat** : Même couleurs, même design, même UX ! 🎨

---

## 📊 TABLEAU DE BORD DE MIGRATION

### Progression

```
Phase 1 : Préparation              [████████████████████] 100%
  ├─ Client API créé                ✅
  └─ .env.local configuré           ✅

Phase 2 : Authentification         [████████████████████] 100%
  ├─ AuthContext migré              ✅
  ├─ Login migré                    ✅
  ├─ Register migré                 ✅
  └─ Tests passés                   ✅

Phase 3 : Pages                    [████████░░░░░░░░░░░░] 40%
  ├─ Home/Videos                    ✅
  ├─ Profile                        ✅
  ├─ Marketplace                    🔄 En cours
  ├─ Checkout                       ⏳ À faire
  ├─ Wallet                         ⏳ À faire
  ├─ Live                           ⏳ À faire
  └─ Autres (60+ pages)             ⏳ À faire

Phase 4 : Composants               [░░░░░░░░░░░░░░░░░░░░] 0%
  └─ Composants réutilisables       ⏳ À faire

Phase 5 : Upload                   [░░░░░░░░░░░░░░░░░░░░] 0%
  └─ Images & Vidéos                ⏳ À faire

Phase 6 : WebSocket                [░░░░░░░░░░░░░░░░░░░░] 0%
  └─ Temps réel                     ⏳ À faire

Phase 7 : Tests                    [░░░░░░░░░░░░░░░░░░░░] 0%
  └─ Validation complète            ⏳ À faire

TOTAL PROGRESSION                  [████████░░░░░░░░░░░░] 35%
```

---

## 💰 AVANTAGES DE LA MIGRATION

### Avant (Base44) ❌

```
Coûts :
- Abonnement Base44 : ~50-200€/mois
- Scaling automatique : Facturé à l'usage
- Dépendance externe : Risque de service down
- Contrôle limité : Backend géré par Base44
- Vendor lock-in : Difficile de migrer

Total : 600-2400€/an + frais usage
```

### Après (Votre Backend) ✅

```
Coûts :
- Hébergement backend : ~10-20€/mois (Railway, Render)
- Base de données Supabase : Gratuit jusqu'à 500MB, puis ~25€/mois
- CDN (images/vidéos) : ~10-30€/mois
- Contrôle total : Votre infrastructure
- Pas de vendor lock-in : Migration facile

Total : ~300-600€/an

ÉCONOMIE : 300-1800€/an + indépendance
```

---

## 🎯 PLAN D'EXÉCUTION (7 jours)

### Jour 1 : Préparation
- ✅ Créer `src/api/expressClient.js`
- ✅ Configurer `.env.local`
- ✅ Tester connexion backend

### Jour 2 : Authentification
- ✅ Migrer `AuthContext.jsx`
- ✅ Tester login/register/logout
- ✅ Vérifier refresh token

### Jours 3-4 : Pages Prioritaires
- ✅ Home/Videos
- ✅ Profile
- ✅ Marketplace
- ✅ Search

### Jours 5-6 : Pages Secondaires
- ✅ Checkout/Orders
- ✅ Wallet
- ✅ Notifications
- ✅ Settings

### Jour 7 : Finitions
- ✅ Upload fichiers
- ✅ WebSocket
- ✅ Tests complets
- ✅ Corrections bugs

---

## 🆘 EN CAS DE PROBLÈME

### Problème : CORS Error

```javascript
// Backend : backend/src/index.ts
app.use(cors({
  origin: 'http://localhost:5173',  // ✅ Votre frontend
  credentials: true,
}));
```

### Problème : 401 Unauthorized

```javascript
// Vérifier que le token est envoyé
console.log(localStorage.getItem('access_token'));

// Vérifier l'intercepteur axios
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  console.log('Token:', token);  // ✅ Debug
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Problème : Backend ne démarre pas

```bash
# Vérifier les variables d'environnement
cd backend
cat .env  # ou notepad .env sur Windows

# Vérifier DATABASE_URL
# Vérifier JWT_SECRET
```

---

## ✅ CHECKLIST FINALE

### Avant de Déployer

```
Configuration :
- [ ] backend/.env créé et rempli
- [ ] .env.local créé et rempli
- [ ] DATABASE_URL configuré
- [ ] JWT secrets générés
- [ ] Clés Stripe obtenues
- [ ] Clés Orange Money obtenues

Migration :
- [ ] Client API créé (expressClient.js)
- [ ] AuthContext migré
- [ ] Toutes les pages migrées
- [ ] Upload fichiers implémenté
- [ ] WebSocket migré

Tests :
- [ ] Authentification testée
- [ ] CRUD vidéos testé
- [ ] CRUD produits testé
- [ ] Paiements testés (mode test)
- [ ] Upload testé
- [ ] WebSocket testé

Déploiement :
- [ ] Backend déployé
- [ ] Frontend déployé
- [ ] Base de données migrée
- [ ] Variables d'env production configurées
```

---

## 🎓 RÉSUMÉ FINAL

### Ce que vous gardez (100%) ✅

```
✅ Toutes vos couleurs
✅ Tout votre design
✅ Tous vos composants UI
✅ Toute votre logique métier
✅ Toute votre architecture frontend
✅ Tailwind, Radix UI, Framer Motion
✅ Vos 70+ pages
✅ Vos 202 composants
```

### Ce que vous changez (5%) 🔄

```
🔄 base44.auth.* → api.auth.*
🔄 base44.entities.Video.* → api.videos.*
🔄 base44.entities.Product.* → api.products.*
🔄 etc.
```

### Ce que vous gagnez ✨

```
✨ Indépendance totale (pas de Base44)
✨ Contrôle complet de votre backend
✨ Économies (300-1800€/an)
✨ Pas de vendor lock-in
✨ Scalabilité à votre rythme
✨ Backend Express professionnel
```

---

## 📞 PROCHAINES ÉTAPES

### Je peux vous aider à :

1. **Créer les fichiers .env**
   - Générer JWT secrets
   - Configurer DATABASE_URL
   - Préparer toutes les variables

2. **Créer expressClient.js complet**
   - Avec toutes vos entités
   - Gestion JWT automatique
   - Error handling

3. **Migrer les pages prioritaires**
   - Home, Profile, Marketplace
   - Checkout, Wallet
   - Étape par étape

4. **Implémenter l'upload**
   - Images et vidéos
   - Avec barre de progression

5. **Configurer WebSocket**
   - Socket.io client
   - Hooks réutilisables

**Dites-moi par quoi vous voulez commencer !** 🚀

---

**FIN DU GUIDE** ✅

