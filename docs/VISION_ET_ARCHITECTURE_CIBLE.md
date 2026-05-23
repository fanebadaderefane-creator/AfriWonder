# Vision & architecture cible — AfriWonder

**Couleur de l’application : BLEU** Stack cible : React PWA, Flutter, Node.js/Express, PostgreSQL, Redis, Python (IA), HLS+CDN, AWS/GCP. Tokens : `docs/DESIGN_TOKENS_UI.md`.

Ce document fixe la vision produit, le modèle économique, le cahier des charges global et **l’architecture technique cible** (objectif long terme).

---

## 1. Vision

Créer **la première super-plateforme africaine** où les utilisateurs peuvent :

- **Communiquer**
- **Créer du contenu**
- **Vendre**
- **Acheter**
- **Payer**
- **Apprendre**

… **sans quitter l’application**.

---

## 2. Problème

Aujourd’hui les Africains utilisent des plateformes étrangères (Facebook, TikTok, YouTube, WhatsApp) :

- Les **données ne sont pas en Afrique**
- Les **créateurs africains sont peu valorisés**
- L’**argent sort du continent**

---

## 3. Solution

Une **super-app africaine tout-en-un** avec :

- Réseau social  
- Vidéos courtes  
- Messagerie  
- Live streaming  
- Marketplace  
- Paiement digital  
- Services divers  

---

## 4. Marché (aligné audit page 15)

| Indicateur | Valeur | Source |
|---|---:|---|
| Population Afrique (2026) | 1.5 milliard | UN Data |
| Taux de pénétration mobile | 51% et croissant | GSMA 2025 |
| Utilisateurs internet mobile | 570 millions | DataReportal 2025 |
| Marché e-commerce Afrique | $75 milliards (2026E) | Statista |
| Croissance e-commerce | +25% / an | McKinsey Africa |
| Valeur mobile payments Afrique | $1 trillion (2025) | FSD Africa |
| Créateurs de contenu Afrique | 12+ millions actifs | Creator Economy |
| Concurrents principaux | Jumia, TikTok, WhatsApp | Marché fragmenté |

Lecture produit: la traction vient du couplage vidéo + commerce + paiements mobiles, sur un marché encore fragmenté.

---

## 5. Modèle économique (MVP Phase 1)

| Source de revenus | Mécanisme | Revenus potentiels (An 1) | Priorité |
|---|---|---:|---|
| Commission marketplace | 5-10% sur chaque vente | $15,000 - $50,000 | Haute |
| Abonnements créateurs | $5-15/mois (badges, analytics) | $8,000 - $30,000 | Haute |
| Frais de paiement | 1.5% sur transactions mobiles | $5,000 - $20,000 | Haute |
| Publicité ciblée | CPM/CPC sur le feed vidéo | $3,000 - $15,000 | Moyenne |
| Dons live streaming | 30% commission sur les dons | $2,000 - $10,000 | Moyenne |
| AfriWonder Pro | $9.99/mois (utilisateurs premium) | $5,000 - $25,000 | Moyenne |
| B2B / API partenaires | SDK MiniApp pour PME africaines | $10,000 - $50,000 | Long terme |

### Projections financières (base conservatrice)

| Période | Utilisateurs actifs | GMV Marketplace | Revenus estimés | Coûts opex / mois |
|---|---:|---:|---:|---:|
| Mois 1-3 (Beta) | 500 - 2,000 | $5,000 | $500 - $2,000 | $500 |
| Mois 4-6 (Lancement) | 5,000 - 15,000 | $50,000 | $5,000 - $15,000 | $1,500 |
| Mois 7-12 (Croissance) | 50,000 - 150,000 | $500,000 | $50,000 - $120,000 | $5,000 |
| An 2 (Scale) | 500,000+ | $5M+ | $500,000+ | $20,000 |

---

## 6. Architecture technique cible (idéale)

| Couche | Technologie |
|--------|-------------|
| **Mobile** | **Flutter** (Android + iOS) — voir `flutter_app/` |
| **Backend** | **Node.js / Express** (backend actif `backend/`) |
| **Base de données** | **PostgreSQL** + **Cassandra** |
| **Cache** | **Redis** |
| **Recherche** | **Elasticsearch** |
| **IA** | **Python** (reco, modération, traduction, assistant) |
| **Streaming** | **HLS** + **CDN** |
| **Cloud** | **Amazon Web Services** ou **Google Cloud** |

**Mobile officiel :** Flutter — voir `flutter_app/`. Web : PWA React. Backend actuel : Node/Express (une seule API pour PWA et mobile).

---

## 7. Cahier des charges — Super-plateforme (résumé structuré)

### 1. Gestion des comptes et identités
- Inscription : téléphone, email, réseaux sociaux ; OTP SMS, vérification email, captcha, CGU.
- Connexion : email/mot de passe, téléphone/code, biométrie, 2FA.
- Profil : photo, couverture, bio, pseudo unique, localisation, liens, badge vérifié.
- Paramètres : confidentialité, sécurité, notifications, historique connexions, suppression compte.

### 2. Réseau social complet
- Publications : texte, photo, vidéo, carrousel, sondage, événements, liens.
- Interactions : likes, commentaires, réponses, partages, repost, sauvegarde.
- Gestion : modification, suppression, programmation.

### 3. Abonnements et relations
- Suivre / se désabonner, suggestions amis, liste abonnés / abonnements.

### 4. Fil d’actualité intelligent
- Flux abonnements, recommandations personnalisées, tendances globales/locales, hashtags populaires.

### 5. Vidéos courtes (style TikTok)
- Capture, montage intégré, filtres, effets, bibliothèque musicale, remix.
- Interactions : likes, commentaires, partages.

### 6. Stories (style Instagram/Snapchat)
- Photo/vidéo, texte, stickers, sondages, questions ; suppression auto 24 h.

### 7. Messagerie complète (style WhatsApp)
- Messages : texte, audio, image, vidéo, documents ; éphémères, réactions, réponses.
- Appels audio et vidéo.
- Groupes : discussion, admins, invitations.

### 8. Vidéos longues (style YouTube)
- Chaînes, upload, playlists, abonnements chaînes, commentaires.

### 9. Live streaming
- Live vidéo/audio, chat direct, modération, invités live.

### 10. Monétisation créateurs
- Dons, cadeaux virtuels, abonnements premium, partage revenus, publicité.

### 11. Marketplace
- Création boutique, catalogue, stock, avis, discussion vendeur.

### 12. Paiement numérique (style WeChat Pay)
- Portefeuille, transfert, paiement QR, factures.

### 13. Livraison
- Livraison repas, colis, suivi en temps réel.

### 14. Transport
- Réservation taxi, covoiturage, suivi GPS.

### 15. Services professionnels
- Profils professionnels, freelances, offres emploi, candidatures.

### 16. Éducation
- Cours en ligne, classes virtuelles, examens, certificats.

### 17. Streaming musique
- Musique, playlists, podcasts.

### 18. Jeux
- Mini-jeux, multijoueurs, classement.

### 19. Santé
- Consultation médecin, rendez-vous, pharmacies proches.

### 20. Voyage
- Réservation hôtels, vols, guides touristiques.

### 21. Carte interactive
- Carte commerces, navigation GPS, lieux populaires.

### 22. Communautés
- Groupes publics/privés, forums.

### 23. Événements
- Création événements, invitations, billetterie.

### 24. Cloud personnel
- Stockage fichiers, sauvegarde photos, partage documents.

### 25. Recherche globale
- Utilisateurs, vidéos, produits, hashtags.

### 26. Notifications
- Likes, commentaires, abonnements, messages.

### 27. Publicité
- Campagnes entreprises, promotion contenu, statistiques.

### 28. Statistiques créateurs
- Vues, abonnés, engagement, revenus.

### 29. Sécurité
- 2FA, chiffrement messages, détection spam, signalement contenu.

### 30. Administration plateforme
- Back-office : utilisateurs, contenus, signalements, statistiques.

### 31. Intelligence artificielle
- Recommandations, modération auto, traduction, assistant virtuel.

### 32. Multilingue
- Français, anglais, arabe, langues africaines.

### 33. Plateformes
- Application Android, application iOS, version web.

---

## 8. Résultat final visé

Avec cette plateforme, un utilisateur peut : **discuter**, **publier**, **regarder des vidéos**, **écouter de la musique**, **vendre et acheter**, **payer**, **apprendre**, **jouer**, **travailler**, **voyager** — **le tout dans une seule application**.

---

## 9. Références projet

- **Couleur application** : bleu → `docs/DESIGN_TOKENS_UI.md`
- **Architecture actuelle** : `docs/ARCHITECTURE.md`
- **Design tokens (Web + Mobile)** : `docs/DESIGN_TOKENS_UI.md`

---

## 10. Roadmap de développement (alignée audit page 17)

### Phase 1 — Fondation
- Nettoyage complet du repository.
- Migration vers Supabase (DB + Auth + Storage) — cible produit.
- Déploiement backend sur Render avec CI/CD.
- Sécurisation : Doppler, GitHub Secret Scanning, rate limiting.
- Création du design system Figma AfriWonder.
- Fichiers `.env.example` créés et documentés.
- Tests de charge : API cible 1000 req/s.

### Phase 2 — MVP Vidéo + Marketplace
- Feed vidéo vertical (TikTok-like) comme feature centrale.
- Upload vidéo chunked vers Cloudflare R2.
- Live streaming avec Agora (intégration existante à finaliser).
- Marketplace : produits, panier, checkout.
- Intégration Orange Money + Wave (Sénégal, Côte d’Ivoire, Mali).
- PWA finalisée et déployée sur `afri-wonder.app`.
- Beta test avec 500 utilisateurs sélectionnés.

### Phase 3 — Flutter + Lancement (Mois 6-8)
- Application Flutter (iOS + Android) avec architecture Riverpod.
- Soumission App Store + Google Play.
- Notifications push via Firebase.
- Mode offline first avec Hive.
- Optimisation performance (Lighthouse > 90).
- Lancement marketing dans 3 pays pilotes.
- Recrutement des 100 premiers créateurs partenaires.

### Phase 4 — Croissance
- Gamification complète (badges, points, leaderboard).
- Recommandation IA (TensorFlow.js ou API Python).
- Expansion paiements : MTN Mobile Money, Stripe Afrique.
- Télémedecine (priorité 2 après vidéo + marketplace).
- Programme AfriWonder for Business (B2B SDK).
- Levée de fonds Seed (cible $500K - $2M).
