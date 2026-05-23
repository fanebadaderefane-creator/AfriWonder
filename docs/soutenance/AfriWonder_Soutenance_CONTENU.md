# Diapositive 1
Soutenance de Projet

AfriWonder Super-App
Écosystème numérique multi-services

Candidat : FANE ABDOULAYE · Élève Ingénieur
Encadrant : Pr. HAMZA KHALFI
Filière : Management et Gouvernance des Systèmes d’Information (MGSI)
École Nationale des Sciences Appliquées de Khouribga (ENSAK)

AfriWonder — Projet d’ingénierie MGSI · Présentation complète avec illustrations

## Notes orateur

Accueillez le jury avec le titre exact du projet, votre identité ENSAK/MGSI, et l’encadrant.
Annoncez la durée (ex. 12–15 minutes) puis le déroulé.

---

# Diapositive 2
Sommaire de la présentation

• Introduction et contexte du projet
• Objectifs du projet
• Méthodologie de travail
• Analyse fonctionnelle et métiers
• Architecture système et stack technologique
• Conception de la base de données
• Développement mobile et PWA
• Sécurité, performance et DevOps
• Conclusion et perspectives

## Notes orateur

Structurez votre oral : du contexte aux objectifs et à la méthode, puis fonctionnel, technique, preuves (captures / CI) et conclusion.

---

# Diapositive 3
Introduction au projet AfriWonder

• Genèse : répondre à la fragmentation numérique en Afrique
• Vision : une « Super-App » unifiée (Social, Commerce, Finance, Services)
• Ambition : centraliser l’expérience dans un écosystème régional cohérent
• Valeur ajoutée : accessibilité, monétisation locale, services de proximité

## Notes orateur

Donnez le « pourquoi » avant le « comment » : un seul compte, des parcours bout-en-bout, une vision produit alignée sur les usages mobile money et la faible bande passante.

---

# Diapositive 4
Objectifs du projet

Objectifs généraux
 
• Créer une super-app africaine multi-services
• Centraliser les services numériques dans une seule plateforme
• Optimiser l’accessibilité mobile et web

Objectifs techniques
 
• Concevoir une architecture scalable
• Assurer la sécurité des transactions
• Permettre le temps réel et la haute disponibilité

Cette slide relie la vision métier aux exigences d’ingénierie avant la problématique et les besoins détaillés.

## Notes orateur

Insistez : objectifs généraux = valeur utilisateur et territoire ; objectifs techniques = qualités non fonctionnelles (scalabilité, sécurité, disponibilité, temps réel).

---

# Diapositive 5
Méthodologie de travail

• Méthode Agile / Scrum (itérations courtes, livrables incrémentaux, revues régulières)
• Gestion des versions avec Git / GitHub (branches thématiques, Pull Requests)
• Découpage en sprints avec objectifs livrables (features + correctifs)
• Suivi des tâches (issues / backlog GitHub ou équivalent : À faire · En cours · Terminé)
• Workflow CI/CD : lint, typecheck, tests automatisés, garde qualité avant merge et déploiement

## Notes orateur

À l’ENSAK MGSI : montrer le chaînon Organisation → Outils → Qualité logicielle.
Évoquez en une phrase vos rituels Scrum (daily courte, sprint review, rétrospective si applicable).

---

# Diapositive 6
Problématique et enjeux stratégiques

• Fragmentation des services mobiles en Afrique
• Difficultés d’accès aux infrastructures de paiement internationales
• Contraintes de connectivité et de performance des terminaux
• Nécessité d’une gouvernance centralisée des données (MGSI)

## Notes orateur

Reliez chaque enjeu à un choix d’architecture : API unifiée, cache, compression, passerelles de paiement locales, traçabilité et contrôle des accès.

---

# Diapositive 7
Analyse des besoins fonctionnels

• Modules principaux : feed vidéo, marketplace, messagerie temps réel
• Services intégrés : wallet, transport, santé, tontines
• Profils : créateurs, vendeurs, prestataires, administrateurs
• Transverse : traduction, chatbots, notifications push

## Notes orateur

Présentez un découpage par domaines : social, commerce, finance, services locaux, puis les briques transverses (i18n, assistance, alertes).

---

# Diapositive 8
Cartographie des cas d’utilisation

• Social : publication et interaction sur le contenu vidéo
• Marketplace : cycle annonce → panier → paiement sécurisé
• Wallet : solde, historique, règles de sécurité (PIN / limites selon implémentation)
• Gouvernance : modération et administration globale

## Notes orateur

Insistez sur la complétude du parcours : ce n’est pas une vitrine, c’est un système transactionnel.

---

# Diapositive 9
Architecture logique du système

Clients
PWA (Vite/React) · Mobile (Expo/RN)

Communication
REST JWT · WebSockets Socket.IO

Backend
Express · Routes / Services · Zod

Persistance
Prisma · PostgreSQL

Cache temps réel
Redis · rate limit · adapter sockets

## Notes orateur

Modèle client-serveur distribué, API REST sécurisée, WebSockets ; découpage modulaire par domaine ; couches routes / services / données.

Lecture : flux descendant (clients → API → données). Socket.IO permet le temps réel ; Redis aide à scaler horizontalement quand plusieurs instances backend tournent.

---

# Diapositive 10
Stack technologique : choix d’efficacité

• Typescript côté backend et sur une grande partie des clients (alignement d’équipe)
• Backend : Node.js + Express
• Web PWA : React 18 + Vite
• Mobile : React Native + Expo (SDK 54+)

## Notes orateur

Nuance orale : le dépôt peut contenir aussi du JS historique ; l’objectif est la cohérence TypeScript sur le code critique.

---

# Diapositive 11
Architecture backend et API

• Routage structuré par domaine métier (social, marketplace, wallet, services…)
• Validation Zod sur les entrées sensibles
• Middlewares : JWT, rate limiting, Helmet, CORS
• Médias : Multer + traitements (ex. Sharp / transcodage selon chemins)

## Notes orateur

Expliquez la séparation des responsabilités : route fine, service métier, accès Prisma, journalisation et gestion d’erreurs centralisée.

---

# Diapositive 12
Modélisation des données avec Prisma

• ORM Prisma pour productivité et typage fort
• PostgreSQL relationnel, schéma étendu (≈ 100 modèles dans le schéma Prisma du dépôt)
• Migrations automatisées
• Optimisation des requêtes pour volumes importants (index, requêtes ciblées)

## Notes orateur

Le schéma massif est un atout (richesse fonctionnelle) et un risque (onboarding) : dites comment vous le documentez (Swagger, conventions de nommage).

---

# Diapositive 13
Schéma : User comme hub métier

USER

Vidéos

Order

Wallet

Stories

Messagerie

Marketplace

Illustration relationnelle : un utilisateur peut cumuler rôles (créateur, acheteur, prestataire) selon modules.

## Notes orateur

Expliquez au jury que PostgreSQL impose l’intégrité référentielle : tout module sensible (paiement, livraison) reste relié à une identité stable (User).
Les traits sont une simplification du schéma Prisma réel (~100 modèles).

---

# Diapositive 14
Structure du schéma (focus métier)

• User : pivot vidéos, wallet, commandes, rôles
• Marketplace : produits, catégories, panier, stocks
• Wallet : transactions, soldes, historique
• Social : abonnements, commentaires, likes, stories

## Notes orateur

Reprenez le schéma illustré : cohérence transactionnelle et contraintes d’intégrité.

---

# Diapositive 15
Stratégie frontend : PWA vs mobile natif (Expo)

• PWA : reach web, SEO, déploiement rapide, expérience légère
• Mobile : caméra, notifications push, modules natifs, usage terrain
• Partage des principes d’intégration API (même contrat backend)
• UI web : Tailwind + composants ; mobile : design system RN cohérent avec la marque

## Notes orateur

Ne promettez pas « un seul design system pixel-perfect » : dites « cohérence UX et patterns partagés ».

---

# Diapositive 16
État serveur et expérience utilisateur

• TanStack Query pour cache, re-fetch et résilience réseau
• Zustand pour état global léger (session, préférences)
• Persistance locale (stockage sécurisé côté mobile selon modules)
• Optimistic UI sur interactions sociales (likes, commentaires) lorsque pertinent

## Notes orateur

Soulignez le bénéfice en Afrique : moins de requêtes inutiles, meilleure UX sur connexion instable.

---

# Diapositive 17
Illustration : temps réel (Socket.IO)

Client A
Messagerie

Serveur Socket.IO
rooms · auth JWT

Client B
Présence

Redis adapter
(multi-instance)

Événements typiques : message, typing, notification, géolocalisation ride/livraison (selon modules activés).

## Notes orateur

Précisez : la messagerie et les salons utilisent Socket.IO.
En production avec plusieurs backends, REDIS_URL active l’adaptateur Redis pour diffuser les événements entre instances.

---

# Diapositive 18
Communication temps réel (détail)

• Socket.IO pour messagerie instantanée
• Salons / rooms et présence en ligne
• Notifications événementielles (social et commerce)
• Scalabilité : adaptateur Redis quand plusieurs instances backend

## Notes orateur

Référez-vous au schéma : authent JWT sur handshake, rooms par utilisateur/conversation.

---

# Diapositive 19
Illustration : flux paiement (vue haut niveau)

1 — Initiation
POST sécurisé
idempotence · risque/KYC selon périmètre

2 — Provider
Stripe / OM / autres
vérif signatures

3 — Webhook
body brut · secret
replay protection

4 — Confirmation
mise à jour commande /
wallet / abonnements

Le projet encode plusieurs passerelles dans `payments.routes` : le jury peut être informé du positionnement régional ET international.

## Notes orateur

Insistez sur la conformité sécuritaire : webhook en body brut, vérifications, et désactivation du « trust webhook » en production.
 Mentionnez brièvement Stripe + paiements mobiles locaux disponibles dans l’implémentation.

---

# Diapositive 20
Services de paiement

• Passerelles : Stripe + solutions locales (ex. Orange Money, Wave, Moov…) selon périmètre déployé
• Webhooks avec vérifications (signatures / règles anti-abus)
• Workflow typique : init → callback/provider → mise à jour commande ou wallet
• Traçabilité financière : logs d’audit, idempotency sur init sensible

## Notes orateur

Soyez factuel sur ce qui est activé sur votre environnement de démo (clés prod vs sandbox).

---

# Diapositive 21
Traduction & intelligence artificielle

• Traduction LibreTranslate (+ repli MyMemory selon routes)
• Chatbots pour assistance contextualisée (données métier)
• STT / sous-titres : chantier en cours (Whisper/OpenAI ou pipeline interne)
• Modération assistée par règles + listes de contrôle

## Notes orateur

Dites explicitement où c’est encore partiel pour éviter les questions surprises du jury.

---

# Diapositive 22
Sécurité du système d’information

• JWT access + refresh, rotation/blacklist selon implémentation
• XSS / CSRF : protections middleware + bonnes pratiques cookies
• Injection SQL : Prisma (requêtes paramétrées)
• Proxy média anti-SSRF : liste blanche de domaines
• Secrets : variables d’environnement, pas de credentials en repo

## Notes orateur

Ajoutez un exemple oral : tentative d’abus webhook rejetée faute de signature valide.

---

# Diapositive 23
Performance et optimisations

• Code splitting et lazy loading côté frontend web
• Compression HTTP + stratégie de cache Redis côté API
• Vidéos : streaming par fragments lorsque disponible ; adaptation réseaux lents
• Observabilité : Sentry + exposition métriques /metrics format Prometheus

## Notes orateur

Connectez perf et contexte Mali/Afrique : latence, coût data, cold start.

---

# Diapositive 24
Illustration : chaîne DevOps simplifiée

Git

CI
GitHub Actions

Build / tests

Docker Compose

Nginx TLS

3× backend
(haute dispo — compose)

Postgres 15

Redis 7

Certbot TLS

## Notes orateur

À l’oral : la réplication compose est un objectif documenté dans le repo ; précisez la plateforme de déploiement réelle (serveur VPS, Render, etc.) pour rester vérifiable.

---

# Diapositive 25
Stratégie DevOps et déploiement

• Docker + Docker Compose pour reproductibilité
• Haute disponibilité : plusieurs réplicas backend (fichiers compose)
• Nginx reverse proxy + TLS (Let’s Encrypt / Certbot)
• PostgreSQL 15 et Redis 7

## Notes orateur

Précisez si votre démo est locale, staging cloud, ou production — même architecture, paramètres différents.

---

# Diapositive 26
Automatisation et qualité (CI/CD)

• GitHub Actions : intégration continue
• Contrôles automatiques lint + typecheck
• Tests backend (Jest) et frontend (Vitest) + sélection E2E Playwright sur le repo
• Contraintes de taille de PR pour garder une review efficace

## Notes orateur

Le jury MGSI adore la boucle Qualité→Livraison : montrez où ça se voit dans le dépôt GitHub.

---

# Diapositive 27
Périmètre livré vs feuille de route

• Livré : socle Super-App, API riche, clients web/mobile, temps réel, observabilité, CI
• Partiel / variable selon configuration : IA vocale/STT bout-en-bout production
• Roadmap courte : modularisation, charge, feature flags pilotés produit

## Notes orateur

Cette slide « protège » votre crédibilité : vous projetez mais vous ne cachez pas l’état réel.

---

# Diapositive 28
Preuves techniques (vérifiables dans le dépôt)

• Schéma Prisma : environ 100 modèles PostgreSQL
• Socket.IO + adaptateur Redis optionnel pour multi-instance
• Endpoints de santé/métriques et intégration Sentry backend/mobile
• Nombre important de routes domaine + tests automatisés en CI

## Notes orateur

Utilisez « vérifiable » : le jury peut demander où — vous pointez dossiers/backend/CI.

---

# Diapositive 29
Captures d’écran — partie 1 / 2 (Web & modules)

Visuels issus du dépôt lorsqu’ils existent (dossier public/). Complétez Wallet, Messagerie et Admin avec vos captures réelles (Win+Shift+S ou outil téléphone).

Page d’accueil / Landing

Feed vidéo

Marketplace

Wallet

À insérer
capture

Wallet

Messagerie (AfriChat)

À insérer
capture

Messagerie (AfriChat)

Panneau administrateur

À insérer
capture

Panneau administrateur

## Notes orateur

Dites au jury ce qui est une maquette/marketing PNG du repo vs une capture fonctionnelle live.
Complétez les cases en pointillés avant la défense.

---

# Diapositive 30
Captures d’écran — partie 2 / 2 (Application mobile Expo)

Application mobile (Expo) — feed, création vidéo, notifications, etc.

Conseil : insérez ici une capture du flux principal sur émulateur ou appareil (barre de statut visible, version lisible).

## Notes orateur

Si vous projetez depuis un téléphone, cette slide peut être remplacée par une véritable démo live ; sinon conservez une capture nette avec identité AfriWonder visible.

---

# Diapositive 31
Défis techniques & solutions

• Complexité du schéma Prisma massif → conventions, migrations, modularisation progressive
• Lecture vidéo sur réseaux instables → politiques buffer, qualités adaptatives
• Cohérence auth PWA/mobile → même contrat JWT, refresh, stockage mobile sécurisé
• Proxy média SSRF potentiel → liste blanche stricte & revues sécurité

## Notes orateur

Pour chaque défi : symptôme, cause, contre-mesure, résultat partiel/complet.

---

# Diapositive 32
Limites actuelles assumées

• Monolithe encore dominant (scalabilité verticalisée puis découpage progressif)
• Dépendance à fournisseurs IA/traduction pour certains SLA
• STT/Speech-to-text : placeholders ou finalisation environnement-specific
• Schéma DB dense : courbe d’apprentissage pour nouvelles équipes

## Notes orateur

Terminez cette slide par une phrase « ce n’est pas un échec, c’est une dette projetée avec plan ».

---

# Diapositive 33
Améliorations futures et évolutions

• Microservices ou services autonomes pour domaines critiques (paiements, médias)
• IA/STT/NLP finalisées et autosuffisantes quand données & consentement permettent
• Tests de montée en charge industriels au-delà des scripts projet
• Feature flags pour déploiement progressif sans casser les clients

## Notes orateur

Clarifiez que la transition architecture est coûteuse : elle se fait après traction et métriques.

---

# Diapositive 34
Compétences acquises & bilan personnel

• Cycle de vie full-stack réel : conception → implémentation → tests → exploitation
• Gouvernance SI : données, sécurité, conformité fonctionnelle (angle MGSI)
• Architectures évolutives : résilience réseaux pauvres, supervision
• Culture qualité industrielle : PR, automatisation CI, documentation

## Notes orateur

Reprendre 2 compétences en lien avec le référentiel ENSAK MGSI.

---

# Diapositive 35
Conclusion générale

• Réponse techno concrète au marché africain (fragmentation vs plateforme unifiée)
• Projet complet : innovation UX + rigueur ingénierie
• Validation académique des compétences MGSI
• Ouverture : industrialisation progressive et mesure terrain

## Notes orateur

Une phrase forte : AfriWonder n’est pas un prototype isolé mais une base industrielle évolutive.

---

# Diapositive 36
Merci de votre attention

Questions ?
AfriWonder · Super-App régionale · PWA · Mobile Expo · Backend Express · PostgreSQL · Sécurité & observabilité

## Notes orateur

Clôture courte : résultat, limites assumées, ouverture industrialisation.

---
