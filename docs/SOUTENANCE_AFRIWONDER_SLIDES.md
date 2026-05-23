# Soutenance AfriWonder — Plan des 15 slides

À copier dans PowerPoint ou Google Slides. Environ 1–2 min par slide (soutenance 15–20 min).

---

## Slide 1 — Page de garde
**Titre :** Conception et développement d’une super-app africaine : AfriWonder  
**Sous-titre :** Rapport de stage — Projet de fin d’études  
**Lignes :** École d’ingénieurs de Khouribga | [Ton nom] | [Année universitaire] | [Date]

---

## Slide 2 — Contexte du stage
**Titre :** Contexte du stage  
**Points :**
- Stage réalisé sous forme de **projet** (hors entreprise)
- École d’ingénieurs de Khouribga
- Objectif : concevoir et développer une application web/mobile complète (architecture + fonctionnalités)

---

## Slide 3 — Problématique et motivation
**Titre :** Problématique et motivation  
**Points :**
- Aujourd’hui : les Africains utilisent massivement Facebook, TikTok, YouTube, WhatsApp
- Risque : si ces plateformes deviennent inaccessibles, peu d’alternatives **par et pour** les Africains
- Notre réponse : une plateforme numérique africaine tout-en-un pour valoriser les créateurs, faciliter la communication et soutenir l’économie numérique localew

---

## Slide 4 — Vision AfriWonder
**Titre :** Vision AfriWonder  
**Points :**
- **Première super-app vidéo africaine**
- Relie : **Créateurs** (vidéo, live, stories) | **Commerçants** (marketplace, paiements) | **Communauté** (réseau social, messagerie, services)
- Tout dans une seule application

---

## Slide 5 — Analyse du marché
**Titre :** Analyse du marché africain  
**Points (ou tableau) :**
- TikTok : pas de paiement local intégré
- Facebook : algorithme opaque, données hors continent
- YouTube : peu adapté aux micro-créateurs africains
- WhatsApp : pas de discovery ni marketplace native  
→ **Opportunité** : plateforme locale avec vidéo + marketplace + paiements mobiles (Orange Money, Wave, MTN)

---

## Slide 6 — Fonctionnalités principales
**Titre :** Fonctionnalités principales  
**Points (résumé) :**
- Vidéo (feed type TikTok, upload, likes, commentaires)
- Live (streaming, dons, abonnements)
- Marketplace (produits, panier, checkout, Orange Money / Wave / Stripe)
- Services (transport, food, télémedecine, immobilier, billettrie)
- Finance (wallet, microcrédit, crowdfunding)
- Contenu (actualités, formations, emplois, civic)
- + Voyage, Cloud, Assistant (IA)

---

## Slide 7 — Stack technique
**Titre :** Stack technique  
**Points :**
- **Frontend :** React 18, Vite 6, Tailwind, Radix UI, TanStack Query, Socket.io, PWA
- **Backend :** Node.js, Express, Prisma, PostgreSQL, Socket.io, JWT
- **Outils :** Vitest, Jest, Playwright, ESLint, Prettier

---

## Slide 8 — Pourquoi ces choix ?
**Titre :** Justification des choix technologiques  
**Points (2–3 max) :**
- **Productivité & cohérence :** un seul langage (JS/TS) front + back ; Vite et Prisma pour aller vite
- **UX & résilience :** TanStack Query (cache), PWA (mobile, hors-ligne), buffer vidéo pour connexions lentes
- **Maintenabilité :** tests, lint, migrations versionnées

---

## Slide 9 — Diagramme d’architecture
**Titre :** Architecture du système  
**Contenu :** Insérer le **diagramme d’architecture** (voir `docs/DIAGRAMMES_AFRIWONDER.md`)  
**Légende orale :** Utilisateur → Frontend React (PWA) → API REST + WebSockets (Node/Express) → Services → PostgreSQL

---

## Slide 10 — Diagramme de cas d’utilisation
**Titre :** Cas d’utilisation principaux  
**Contenu :** Insérer le **diagramme de cas d’utilisation** (voir `docs/DIAGRAMMES_AFRIWONDER.md`)  
**Légende orale :** Utilisateur (feed, like, achat, paiement), Vendeur (vente, produits), Admin (modération, config)

---

## Slide 11 — Travaux réalisés
**Titre :** Travaux réalisés (à personnaliser)  
**Points :** Énumère **tes** contributions, par ex. :
- Feed vidéo (scroll type TikTok, buffer, like/scroll/son)
- Pages métier (Home, Create, Marketplace, Voyage, Cloud, Assistant)
- API / backend (routes, services)
- UX (flèche retour, message « Connexion lente »)
- Tests, documentation

---

## Slide 12 — Difficultés et solutions
**Titre :** Difficultés et solutions  
**Points :**
- Connexions lentes → buffer minimum, message utilisateur, preload adaptatif
- Stabilité du player → règles strictes (pas de rechargement intempestif, son au premier clic)
- UX cohérente → flèche retour partout, cache feed (pas de double chargement)

---

## Slide 13 — Déploiement
**Titre :** Déploiement et mise en production  
**Points :**
- Nginx (reverse proxy, HTTPS, fichiers statiques)
- Backend : Docker ou PM2
- Base : PostgreSQL (Supabase ou VPS)
- Variables d’environnement pour les secrets

---

## Slide 14 — Conclusion et perspectives
**Titre :** Conclusion et perspectives  
**Points :**
- Bilan : super-app complète (vidéo, marketplace, services, finance) avec stack moderne et UX adaptée (PWA, mobile, connexions lentes)
- Compétences : full-stack, architecture, API, BDD, temps réel, tests
- Perspectives : Flutter mobile, optimisation backend Node.js, partenariats Orange Money / Wave / MTN

---

## Slide 15 — Merci / Questions
**Titre :** Merci  
**Sous-titre :** Questions ?  
**Optionnel :** Contact ou lien vers le projet / dépôt.

---

*Conseil : garde les slides 9 et 10 pour les diagrammes exportés en PNG depuis `docs/DIAGRAMMES_AFRIWONDER.md` (Mermaid Live Editor ou outil équivalent).*
