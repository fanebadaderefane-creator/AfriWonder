# Diagrammes AfriWonder — Rapport et soutenance

Ce fichier contient les diagrammes au format **Mermaid**. Tu peux :
- **Copier chaque bloc** dans [Mermaid Live Editor](https://mermaid.live) pour générer une image PNG/SVG.
- Les **insérer dans Word** (Export PNG) ou dans **PowerPoint** (slides 9 et 10 de la soutenance).
- Certains outils (VS Code avec extension Mermaid, GitHub, Notion) affichent les diagrammes directement dans le Markdown.

---

## 1. Diagramme de cas d’utilisation (UML-style)

Acteurs : Utilisateur, Vendeur, Administrateur. Cas d’usage : s’inscrire, se connecter, consulter le feed, publier une vidéo, liker/commenter, acheter, payer, vendre, modérer.

```mermaid
flowchart TB
  subgraph Acteurs
    U((Utilisateur))
    V((Vendeur))
    A((Administrateur))
  end

  subgraph Système AfriWonder
    UC1[S'inscrire / Se connecter]
    UC2[Consulter le feed vidéo]
    UC3[Publier une vidéo]
    UC4[Liker / Commenter]
    UC5[Acheter / Payer]
    UC6[Vendre / Gérer produits]
    UC7[Modérer / Configurer]
  end

  U --> UC1
  U --> UC2
  U --> UC3
  U --> UC4
  U --> UC5
  V --> UC1
  V --> UC5
  V --> UC6
  A --> UC7
  A --> UC2
```

**Variante simplifiée (acteurs → système) :**

```mermaid
flowchart LR
  U((Utilisateur))
  V((Vendeur))
  A((Admin))
  S[(Système AfriWonder)]
  U -->|Feed, like, achat, paiement| S
  V -->|Vente, produits| S
  A -->|Modération, config| S
```

---

## 2. Diagramme d’architecture (couches)

Montre le flux : Utilisateur → Frontend → API → Services → Base de données.

```mermaid
flowchart TB
  subgraph Client
    U[Utilisateur]
    U --> FE
  end

  subgraph Frontend["Frontend (React PWA)"]
    FE[Vite, Tailwind, TanStack Query, Socket.io]
  end

  subgraph Backend["Backend (Node.js / Express)"]
    API[API REST + WebSockets]
    SVC[Services métier]
    AUTH[JWT / Auth]
    UPLOAD[Upload / Storage]
    API --> SVC
    API --> AUTH
    API --> UPLOAD
  end

  subgraph Données["Base de données"]
    DB[(PostgreSQL + Prisma)]
  end

  FE -->|HTTP / WS| API
  SVC --> DB
```

**Version verticale (pour slide) :**

```mermaid
flowchart TB
  U[Utilisateur - Navigateur / PWA]
  U --> FE[Frontend React - Vite, Tailwind, TanStack Query]
  FE --> API[API REST + Socket.io - Node.js / Express]
  API --> SVC[Services métier - Auth, Upload]
  SVC --> DB[(PostgreSQL - Prisma)]
```

---

## 3. Schéma de déploiement (production)

Nginx, backend (Docker/PM2), PostgreSQL, frontend statique.

```mermaid
flowchart TB
  INET[Internet]
  INET --> NGINX[Nginx - Reverse proxy, HTTPS, fichiers statiques]

  NGINX --> FRONT[Frontend - Build React]
  NGINX --> BACKEND[Backend Node.js - Docker / PM2]

  BACKEND --> DB[(PostgreSQL - Supabase / VPS)]
```

**Avec détails :**

```mermaid
flowchart LR
  subgraph Internet
    User[Utilisateur]
  end

  subgraph Serveur
    NGINX[Nginx]
    BACKEND[Node.js + Express]
    FRONT[Fichiers statiques]
    NGINX --> BACKEND
    NGINX --> FRONT
    BACKEND --> DB
  end

  subgraph Base
    DB[(PostgreSQL)]
  end

  User --> NGINX
```

---

## 4. Diagramme de séquence — Exemple : lecture du feed

Montre l’interaction entre le client, le frontend, l’API et la base lors du chargement du feed.

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant F as Frontend (React)
  participant A as API (Express)
  participant D as PostgreSQL

  U->>F: Ouvre l'app / scroll
  F->>A: GET /api/feed (JWT)
  A->>A: Vérifie JWT
  A->>D: Requête vidéos (Prisma)
  D-->>A: Liste vidéos
  A-->>F: JSON feed
  F->>F: Cache (TanStack Query)
  F-->>U: Affiche les vidéos
```

---

## 5. Modèle de données (simplifié) — Entités principales

Quelques entités clés du schéma Prisma (pour schéma conceptuel en soutenance).

```mermaid
erDiagram
  User ||--o{ Video : "publie"
  User ||--o{ Like : "like"
  User ||--o{ Comment : "commente"
  User ||--o| Cart : "possède"
  User ||--o{ Order : "passe"

  Video ||--o{ Like : "reçoit"
  Video ||--o{ Comment : "reçoit"

  Product ||--o{ Order : "dans"
  Order ||--o{ OrderItem : "contient"

  User {
    uuid id
    string email
    string username
    string role
  }

  Video {
    uuid id
    string url
    string caption
    uuid authorId
  }

  Product {
    uuid id
    string title
    decimal price
    uuid sellerId
  }

  Order {
    uuid id
    uuid userId
    string status
  }
```

---

## 6. Flux métier — De la création de contenu à l’achat

Résumé du parcours : création → feed → like → achat → paiement.

```mermaid
flowchart LR
  A[Créateur publie vidéo] --> B[Feed vidéo]
  B --> C[Utilisateur like / commente]
  B --> D[Utilisateur découvre produit]
  D --> E[Panier / Checkout]
  E --> F[Paiement Wallet / Mobile Money]
  F --> G[Commande validée]
```

---

## Export des diagrammes en image

1. Ouvre [https://mermaid.live](https://mermaid.live).
2. Colle le code du bloc ` ```mermaid ... ``` ` (sans les balises).
3. Clique sur **Actions** → **Export** → **PNG** ou **SVG**.
4. Insère l’image dans ton rapport Word ou dans les slides 9 et 10 du PowerPoint.

Tu peux aussi utiliser l’extension **Mermaid** dans VS Code pour prévisualiser et exporter depuis l’éditeur.
