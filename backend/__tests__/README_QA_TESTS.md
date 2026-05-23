# Tests QA AfriWonder — A à Z

## Architecture des tests

- **Jest** + **supertest** (backend)
- **Setup** : `backend/__tests__/setup.ts` — connexion Prisma à la DB de test
- **DB** : `DATABASE_URL` dans `.env.test` ou `.env` (ex. `postgresql://.../afriwonder_test`)

## Lancer les tests

```bash
cd backend
npm run test:db    # une fois : créer/migrer la DB de test
npm run test       # tous les tests
npm run test:coverage
```

## Couverture par domaine

### 1. SOCIAL & CONTENU
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `videos.test.ts` | Feed vidéos | list, get, create, like, comment, comments list |
| `live.test.ts` | Live streaming + gifts | list streams, discovery, gifts catalog, live wallet |
| `saves.test.ts` | Saves / Playlists | list saved videos, toggle save |
| `communities.test.ts` | Communautés | list, get, create, join |
| `messages.test.ts` | Messagerie / Chat | conversations, unread count |
| `comments.test.ts` | Commentaires | update, delete |

### 2. E-COMMERCE
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `products.test.ts` | Produits | list, get, create (vendeur) |
| `cart.test.ts` | Panier + Wishlist | get, add, update, remove, clear, breakdown |
| `orders.test.ts` | Commandes API | list, config, stats |
| `reviews.test.ts` | Reviews & ratings | list reviews by product |
| `seller.test.ts` | Seller dashboard | analytics |
| `services.test.ts` | Services locaux | list services |
| `providers.test.ts` | Prestataires | list providers |
| `bookings.test.ts` | Réservations | list bookings (customer) |
| `marketplace.test.ts` | Flow complet | products, cart, orders, checkout |

### 3. ÉDUCATION
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `courses.test.ts` | Cours en ligne | list, wishlist, instructor dashboard |
| `certificates.test.ts` | Certifications | my certificates, verify by token |

### 4. EMPLOI
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `jobs.test.ts` | Job board | list jobs, candidate profile, employer dashboard |

### 5. FINANCE
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `payments.test.ts` | Wallet, transactions | webhook, wallet, transactions |
| `crowdfunding.test.ts` | Crowdfunding | list campaigns |
| `microcredit.test.ts` | Microcrédit / prêts | list loans |

### 6. CIVIC / SOCIÉTÉ
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `civic.test.ts` | Pétitions | list, recommended |
| `news.test.ts` | News / Articles | list, breaking, trending, feed |
| `events.test.ts` | Events | list, my-tickets |

### 7. GAMIFICATION
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `challenges.test.ts` | Challenges | list |
| `leaderboard.test.ts` | Leaderboard | get by range |

### 8. TECH / ADMIN
| Fichier | Domaine | Scénarios |
|---------|---------|-----------|
| `admin.test.ts` | Admin dashboard | dashboard, users list |
| `platform.test.ts` | Platform | revenue stats |
| `health.test.ts` | Health | /health, /health/ready |
| `auth.test.ts` | Auth | register, login, refresh, /me |
| `security.test.ts` | Sécurité | 401 sans token, anti-bot, validation register |
| `users.test.ts` | Utilisateurs | profil, follow |
| `order.service.test.ts` | Orders (service) | logique métier commandes |

## Checklist QA (tous domaines)

- **1. SOCIAL** : vidéos, live+gifts, saves, communautés, messages, comments
- **2. E-COMMERCE** : products, cart, orders, reviews, seller, services, providers, bookings
- **3. ÉDUCATION** : courses, certificates
- **4. EMPLOI** : jobs (list, candidate, employer dashboard)
- **5. FINANCE** : payments (wallet, transactions), crowdfunding, microcredit
- **6. CIVIC** : civic (pétitions), news, events
- **7. GAMIFICATION** : challenges, leaderboard
- **8. TECH** : admin, platform, health, auth, security

## Variables de test

- `NODE_ENV=test`
- `DATABASE_URL` → base dédiée (ex. afriwonder_test)
- `JWT_SECRET` → clé de test (ex. test-secret-key-for-ci)
