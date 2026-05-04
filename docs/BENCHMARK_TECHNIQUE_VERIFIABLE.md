# Benchmark concurrentiel — lecture **technique** (vérifiable)

**Sources dans le code (prioritaires)**  
- `frontend/src/config/productCapabilities.ts` — piliers / niveaux (vérité produit).  
- `frontend/src/config/competitiveMatrix.ts` — grille benchmark : colonne **AfriWonder** dérivée automatiquement des piliers ; concurrents **illustratifs** (non audités).  
- Écrans : **À propos** (`frontend/app/about.tsx`), **Benchmark** (`frontend/app/benchmark.tsx`, entrée Paramètres → *Benchmark concurrentiel*).

Ce document sert à aligner une slide de **positionnement** sur des **faits vérifiables** dans le dépôt et l’API.  
Il ne remplace pas un audit tiers des produits concurrents (WhatsApp, Jumia, WeChat : code fermé).

## Règles d’honnêteté pour la soutenance

1. **Colonne AfriWonder** : chaque ✅ doit correspondre à une **preuve** ci-dessous (fichier, route, écran). Sinon utiliser **⚠️** ou **❌**.
2. **Colonnes concurrents** : ne pas les présenter comme des « audits techniques » : ce sont des **typologies marché** (ce que ces produits sont *connus* pour offrir publiquement). Les symboles du slide restent du **marketing comparatif**, pas des mesures reproductibles sur leur code.
3. **Phrase du type « seule solution qui… »** : **à éviter** au sens strict — impossible à prouver sans inventaire exhaustif de toutes les apps africaines. Formulation sûre : *« Dans ce périmètre fonctionnel et d’après les éléments vérifiables dans notre dépôt, AfriWonder couvre les critères suivants… »*

---

## Critères du tableau (définition opérationnelle)

### 1. Réseau social

**Définition retenue (vérifiable)** : fil d’actualité ou feed de contenus publics, profils utilisateurs, relations (ex. abonnements), pas seulement messagerie privée.

| AfriWonder | Preuve |
|------------|--------|
| ✅ | Feed vidéo / découverte : `frontend/app/(tabs)/index.tsx`, PWA `src/pages/Home.jsx` ; relations `Follow` / profils côté Prisma et API. |

**Limite** : échelle et maturité produit ≠ Meta/TikTok ; le critère est « capacité technique présente », pas « parité d’audience ».

---

### 2. Marketplace

**Définition** : catalogue produits, panier, commande côté app + API.

| AfriWonder | Preuve |
|------------|--------|
| ✅ | `frontend/app/(tabs)/market.tsx`, `frontend/app/cart/index.tsx` ; feature flag `featureFlags.marketplace` ; API produits / commandes via client (`/products`, panier — cf. `cartApi`, routes backend marketplace / orders). |

**Limite** : dépend du remplissage catalogue et de la conformité opérationnelle (vendeurs, logistique) — hors scope « ligne de code seule ».

---

### 3. Paiement mobile

**Définition** : intégration de moyens de paiement mobile (ex. mobile money) dans les flux métier, pas seulement lien externe générique.

| AfriWonder | Preuve |
|------------|--------|
| ✅ (si prod configurée) | Orange Money : `backend/src/routes/payments.routes.ts`, `payment.service` ; panier `frontend/app/cart/index.tsx` (Orange Money, Wave, wallet). Star calls : `backend/src/services/starCall.service.ts`. |
| ⚠️ | En **production**, exiger clés / partenaires réels (`ORANGE_MONEY_*`, etc.) — sans config, les chemins peuvent être en simulation ou erreur explicite. |

---

### 4. Messagerie

**Définition** : conversations persistées, envoi de messages, côté serveur + client.

| AfriWonder | Preuve |
|------------|--------|
| ✅ (backend + PWA) | `backend/src/routes/messages.routes.ts`, services messages ; PWA `src/pages/Chat.jsx`. Inventaire : `docs/VERIFICATION_FONCTIONNALITES_SUPER_APP.md` § messagerie. |
| ⚠️ (mobile natif) | Dettes / statique signalés : `docs/QA_COVERAGE.md` (ex. conversation 1-1, demandes). À dire en soutenance : *« API complète ; parité mobile en cours de durcissement. »* |

---

### 5. Données optimisées

**Définition** : mécanismes explicites pour réseaux faibles (qualité vidéo, compression, caches, indicateurs).

| AfriWonder | Preuve |
|------------|--------|
| ✅ / ⚠️ | Politiques feed / connexion lente et buffers : `src/components/video/VideoCard.jsx` (règle projet : zone lecture verrouillée — ne pas simplifier l’argument sans le code). Budgets : `docs/PERFORMANCE_BUDGETS.md`, `AGENTS.md` § Afrique. |
| Honnêteté | **Aucun benchmark indépendant** dans ce dépôt ne prouve qu’AfriWonder « bat » WhatsApp sur la mesure réseau ; le critère = **fonctionnalités et objectifs d’architecture** présents, pas un classement mesuré. |

---

### 6. Adapté Afrique

**Définition** : monnaie locale (FCFA), locale fr, indicatifs / usages Mali-Afrique, mobile money dans les parcours.

| AfriWonder | Preuve |
|------------|--------|
| ✅ | FCFA, +223, français dans l’app ; mobile money ci-dessus ; docs cibles Mali/Afrique (`AGENTS.md`, rapports projet). |

---

### 7. Open / auditable

**Définition** : code et process inspectables (repo, CI, politique de sécurité) — **pas** « certifié par un organisme ».

| AfriWonder | Preuve |
|------------|--------|
| ✅ (au sens « inspectable ») | Dépôt Git ; `docs/SECURITY.md`, `docs/ENGINEERING_STANDARDS.md`, workflows CI `.github/workflows/`. |
| ❌ (si on sur-vend) | Pas de garantie « audit de sécurité externe » ou « open source totale des données utilisateur » — préciser : **code et gouvernance d’ingénierie** auditable par les parties prenantes autorisées. |

**Concurrents** : applications propriétaires → en général **non ouvertes** au même niveau ; comparaison **qualitative** acceptable si formulée comme telle.

---

## Synthèse pour une slide « vérité technique »

- Remplacer une grille **✅ partout sans nuance** par une **grille AfriWonder** avec **⚠️** sur : messagerie mobile (parité), paiement mobile (config prod), données optimisées (pas de benchmark concurrentiel mesuré).
- Ajouter une **note de bas de slide** : *« Concurrents : lecture marché, non audit code. AfriWonder : statuts issus de `docs/BENCHMARK_TECHNIQUE_VERIFIABLE.md`. »*

---

## Maintenance

Lorsqu’une capacité change (ex. fermeture d’un écart QA messagerie), mettre à jour ce fichier **dans le même PR** que le code, pour ne pas dériver slide ↔ réalité.
