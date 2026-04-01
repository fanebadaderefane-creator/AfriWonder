# 🏗️ Architecture Backend Personnalisé - AfriConnect

## 📐 Structure Proposée

```
backend/
├── src/
│   ├── index.ts                 # Point d'entrée
│   ├── config/
│   │   ├── database.ts         # Configuration DB
│   │   ├── env.ts              # Variables d'environnement
│   │   └── storage.ts          # Configuration stockage
│   ├── database/
│   │   ├── prisma.ts           # Client Prisma
│   │   └── migrations/         # Migrations DB
│   ├── middleware/
│   │   ├── auth.ts             # Authentification JWT
│   │   ├── validation.ts       # Validation Zod
│   │   ├── errorHandler.ts     # Gestion erreurs
│   │   └── rateLimit.ts        # Rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts      # /api/auth/*
│   │   ├── videos.routes.ts   # /api/videos/*
│   │   ├── users.routes.ts     # /api/users/*
│   │   ├── products.routes.ts  # /api/products/*
│   │   ├── orders.routes.ts    # /api/orders/*
│   │   └── ...
│   ├── services/
│   │   ├── auth.service.ts     # Logique authentification
│   │   ├── video.service.ts    # Logique vidéos
│   │   ├── payment.service.ts  # Logique paiements
│   │   └── ...
│   ├── utils/
│   │   ├── logger.ts           # Logging
│   │   ├── upload.ts           # Upload fichiers
│   │   └── ...
│   └── types/
│       └── index.ts             # Types TypeScript
├── prisma/
│   └── schema.prisma           # Schéma base de données
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🗄️ Base de Données PostgreSQL

### Modèles Principaux

```prisma
// User
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique
  password_hash String
  full_name     String?
  profile_image String?
  role          String   @default("user") // user, creator, admin
  is_verified   Boolean  @default(false)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  
  videos        Video[]
  likes         Like[]
  comments      Comment[]
  follows       Follow[] @relation("Follower")
  following     Follow[] @relation("Following")
  orders        Order[]
  products      Product[]
  notifications Notification[]
}

// Video
model Video {
  id             String   @id @default(uuid())
  title          String
  description    String?
  video_url      String
  thumbnail_url  String?
  creator_id     String
  visibility     String   @default("public") // public, prive, abonnes
  category       String?
  views          Int      @default(0)
  likes          Int      @default(0)
  comments_count Int     @default(0)
  shares         Int      @default(0)
  saves          Int      @default(0)
  duration       Int?     // en secondes
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  
  creator        User     @relation(fields: [creator_id], references: [id])
  video_likes    Like[]
  video_comments Comment[]
  view_history   ViewHistory[]
}

// Product
model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  price       Float
  stock       Int      @default(0)
  seller_id   String
  images      String[] // URLs des images
  category    String?
  created_at  DateTime @default(now())
  
  seller      User     @relation(fields: [seller_id], references: [id])
  order_items OrderItem[]
}

// Order
model Order {
  id            String   @id @default(uuid())
  user_id       String
  total_amount  Float
  status        String   @default("pending") // pending, processing, completed, cancelled
  payment_method String?
  shipping_address String?
  created_at    DateTime @default(now())
  
  user          User     @relation(fields: [user_id], references: [id])
  items         OrderItem[]
}

// ... autres modèles (Like, Comment, Follow, etc.)
```

---

## 🔌 API Endpoints

### Authentification
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

### Vidéos
```
GET    /api/videos              # Liste des vidéos
GET    /api/videos/:id          # Détails d'une vidéo
POST   /api/videos              # Créer une vidéo
PUT    /api/videos/:id          # Modifier une vidéo
DELETE /api/videos/:id          # Supprimer une vidéo
POST   /api/videos/:id/like     # Liker une vidéo
POST   /api/videos/:id/comment  # Commenter
```

### Produits
```
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Commandes
```
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id/status
```

### Paiements
```
POST   /api/payments/stripe
POST   /api/payments/orange-money
GET    /api/payments/:id/status
```

---

## 🔐 Authentification JWT

```typescript
// Génération token
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Refresh token
const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '30d' }
);
```

---

## 📤 Upload de Fichiers

### Vidéos
- Upload vers S3/R2
- Génération de miniatures
- Encodage multi-qualité (360p, 480p, 720p, 1080p)
- Webhook pour notifier la fin d'encodage

### Images
- Upload vers S3/R2
- Compression automatique
- Génération de thumbnails

---

## 🔄 WebSockets (Socket.io)

### Événements
```typescript
// Notifications
socket.on('notification', (data) => { ... });

// Chat
socket.on('message', (data) => { ... });

// Live streaming
socket.on('live:join', (data) => { ... });
socket.on('live:gift', (data) => { ... });
```

---

## 📝 Prochaines Étapes

1. **Créer la structure backend**
2. **Configurer Prisma + PostgreSQL**
3. **Créer les routes API de base**
4. **Migrer progressivement le frontend**

**Voulez-vous que je commence par créer la structure backend complète ?** 🚀

