# Civic + Jobs – Niveau international

Ce document décrit les fonctionnalités implémentées pour porter les modules **Civic** (pétitions) et **Jobs** (emploi) au niveau international (Change.org / GovTech pour le civic, LinkedIn/Indeed adapté Afrique pour les jobs).

---

## 1. CIVIC – Pétitions & engagement citoyen

### A. Signature sécurisée
- **Une signature par utilisateur** : contrainte unique `(petition_id, signer_id)` en base.
- **Vérification email obligatoire** : l’utilisateur doit être `is_verified` pour signer (sinon erreur 403).
- **reCAPTCHA** : si la variable d’environnement `RECAPTCHA_SECRET` est définie, le corps de la requête doit contenir `recaptchaToken` (frontend : clé site reCAPTCHA v2).
- **Anti-fraude** : stockage de `ip_address`, `signer_city`, `signer_country` sur chaque signature (optionnel depuis le client).
- **Rate limit** : 15 signatures par IP par fenêtre de 15 minutes sur `POST /api/civic/:id/sign`.

**Body pour signer** : `{ comment?, recaptchaToken?, ipAddress?, signerCity?, signerCountry? }`

### B. Commentaires sur pétition
- Ajout de commentaire : `POST /api/civic/:id/comments` avec `{ content, parentId? }`.
- Liste paginée : `GET /api/civic/:id/comments?page=1&limit=20`.
- Réponses (thread) : `parentId` pour répondre à un commentaire.
- Like / unlike : `POST /api/civic/comments/:id/like`.

### C. Dashboard créateur
- **Route** : `GET /api/civic/creator/dashboard?petitionId=...` (authentifiée).
- **Retour** : par pétition
  - `current_signatures`, `goal_signatures`, `conversionRate`
  - `signaturesLast24h`
  - **`signaturesPerDay`** : tableau `{ date, count }` sur les 30 derniers jours (pour graphique).
  - `shares_count`
  - **`topCities`** : principales villes des signataires.

### D. Ciblage géographique
- Champs sur **CivicPetition** : `country`, `region`, `city`, `is_national`.
- Filtres liste : `GET /api/civic?country=...&region=...&category=...`.
- **Recommandations** : `GET /api/civic/recommended` (authentifié) — pétitions actives selon le pays de l’utilisateur et `is_national`.

### E. Envoi automatique aux autorités
- Quand `current_signatures >= goal_signatures` et que `target_authority_email` est renseigné :
  - Génération d’un **PDF** (titre, résumé, liste des signataires avec nom, ville, pays, date).
  - Envoi d’un **email** à l’autorité avec le PDF en pièce jointe (SMTP configuré : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

### F. Premium / monétisation (champs prêts)
- **CivicPetition** : `is_boosted`, `is_featured`, `featured_until` (création et affichage).
- Don à une pétition : `POST /api/civic/:id/donate` (Orange Money, commission 5 %).

### G. Sécurité & modération
- **Signalement** : `POST /api/civic/:id/report` avec `{ reason, description? }` → enregistrement dans le module Modération (`contentType: 'petition'`).
- Sauvegarder / retirer : `POST /api/civic/:id/save`, `DELETE /api/civic/:id/save`, `GET /api/civic/saved/list`.

---

## 2. JOBS – Emploi

### A. Candidature complète
- **JobApplication** : `job_id`, `applicant_id`, `resume_url` (CV), `cover_letter`, `status` (pending | reviewed | accepted | rejected).
- Postuler : `POST /api/jobs/:id/apply` avec `{ coverLetter?, resumeUrl? }` (si pas de `resumeUrl`, utilisation du CV du profil candidat).
- Employeur : `PUT /api/jobs/applications/:id/status` avec `{ status }` pour passer la candidature en reviewed/accepted/rejected.
- **Rate limit** : 20 candidatures par IP par 15 min sur `POST /api/jobs/:id/apply`.

### B. Profil candidat
- **Route** : `GET /api/jobs/profile/candidate`, `PUT /api/jobs/profile/candidate`.
- **Champs** : `cvUrl`, `portfolioUrl`, `skills` (array), `experience`, `education`, `availability`, `phone`.
- Modèle **CandidateProfile** : `cv_url`, `portfolio_url`, `skills` (JSON), `experience`, `education` (JSON), `availability`, `phone`.

### C. Notation entreprise / candidat
- **Candidat → entreprise** : `POST /api/jobs/rate/company` avec `{ toUserId, jobId, rating (1–5), comment? }` (après candidature sur ce job).
- **Entreprise → candidat** : `POST /api/jobs/rate/candidate` avec `{ toUserId, jobId, rating, comment? }`.
- **CompanyProfile** : `rating_avg`, `rating_count` mis à jour automatiquement.

### D. Profil entreprise vérifié
- **CompanyProfile** : `company_name`, `description`, `logo_url`, `documents_legal`, **`is_verified`**, `rating_avg`, `rating_count`.
- Routes : `GET /api/jobs/profile/company`, `PUT /api/jobs/profile/company` (`companyName`, `description`, `logoUrl`, `documentsLegal`).

### E. Monétisation
- **Limite gratuite** : 3 offres par employeur et par mois (configurable `FREE_JOBS_PER_MONTH`). Au-delà, erreur 403 invitant à passer en premium.
- **Offre premium** : `POST /api/jobs` avec `isPremium: true` et `phone` → création job en `pending`, paiement Orange Money (montant `PREMIUM_JOB_FEE`), puis `POST /api/jobs/premium/:id/confirm` (webhook) pour passer le job en `open` et `is_premium: true`.
- Champs **Job** : `is_premium`, `is_urgent`, `views_count`, `salary_currency`, `country`.

### F. Filtre pays & multi-devise
- Liste : `GET /api/jobs?country=...&category=...&jobType=...&search=...`.
- **Job** : `country`, `salary_currency` (XOF par défaut ; FCFA, MAD, NGN, KES, etc. possibles). La conversion automatique peut s’appuyer sur le module **ExchangeRate** existant côté frontend ou API dédiée.

### G. Tableau de bord employeur
- **Route** : `GET /api/jobs/dashboard/employer` (authentifiée).
- **Retour** : `totalViews`, `totalApplications`, `openJobs`, **`applicationStatusBreakdown`** (pending, reviewed, accepted, rejected), **`conversionRate`** (applications/vues en %), et par job : vues, nombre de candidatures, liste des candidatures (avec candidat + profil).

### H. Recommandations
- **Route** : `GET /api/jobs/recommended` (authentifiée, `?limit=10`).
- Algorithme : pays de l’utilisateur, profil candidat (skills, category), jobs `status: open`, tri par `is_urgent`, `is_premium`, `created_at`.

### I. Sécurité & UX
- **Signalement** : `POST /api/jobs/:id/report` avec `{ reason, description? }` → modération (`contentType: 'job'`).
- Sauvegarder offre : `POST /api/jobs/:id/save`, `DELETE /api/jobs/:id/save`, `GET /api/jobs/saved/list`.
- Incrément des vues : `GET /api/jobs/:id?view=1`.

---

## 3. Déploiement & configuration

### Variables d’environnement
- **Civic**  
  - `RECAPTCHA_SECRET` : si défini, la signature exige un `recaptchaToken` valide.  
  - SMTP pour l’envoi aux autorités : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **Jobs**  
  - Paiement Orange Money (déjà utilisé pour premium) : config existante.

### Base de données
- Exécuter les migrations Prisma (dont `20260207120000_civic_premium_fields` pour `is_boosted`, `is_featured`, `featured_until` sur **CivicPetition**).
- Puis : `npx prisma generate` pour régénérer le client (évite les erreurs TypeScript sur les champs Job/Civic récents).

### Résumé des nouvelles routes

| Module | Méthode | Route | Description |
|--------|--------|--------|-------------|
| Civic | GET | `/api/civic/recommended` | Pétitions recommandées (auth) |
| Civic | GET | `/api/civic/creator/dashboard` | Dashboard créateur (auth) |
| Civic | POST | `/api/civic/:id/sign` | Signer (recaptchaToken optionnel si RECAPTCHA_SECRET) |
| Civic | POST | `/api/civic/:id/report` | Signaler une pétition (auth) |
| Jobs | GET | `/api/jobs/recommended` | Emplois recommandés (auth) |
| Jobs | GET | `/api/jobs/dashboard/employer` | Dashboard employeur (auth) |
| Jobs | GET/PUT | `/api/jobs/profile/candidate` | Profil candidat (auth) |
| Jobs | GET/PUT | `/api/jobs/profile/company` | Profil entreprise (auth) |
| Jobs | GET | `/api/jobs/saved/list` | Offres sauvegardées (auth) |
| Jobs | PUT | `/api/jobs/applications/:id/status` | Statut candidature (employeur, auth) |
| Jobs | POST | `/api/jobs/rate/company` | Noter l’entreprise (auth) |
| Jobs | POST | `/api/jobs/rate/candidate` | Noter le candidat (auth) |
| Jobs | POST | `/api/jobs/:id/save` | Sauvegarder offre (auth) |
| Jobs | DELETE | `/api/jobs/:id/save` | Retirer des sauvegardes (auth) |
| Jobs | POST | `/api/jobs/:id/report` | Signaler une offre (auth) |

---

## 4. Suite possible (bonus)

- **OTP téléphone** (vérification SMS Afrique) : champ ou table dédiée + service OTP, puis condition supplémentaire pour signer (optionnel).
- **Mobile Money** (Orange / MTN / Moov) : déjà utilisé pour dons Civic et jobs premium ; étendre à d’autres produits (boost pétition, offre urgente, mise en avant régionale).
- **Skeleton loading, infinite scroll, notifications push** : côté frontend (API déjà prête pour listes paginées et notifications).
- **Connexion Civic + Jobs + Live** : lives “débat politique” ou “job fair” en réutilisant les modules Live existants et les entités Civic/Jobs.

Une fois les migrations appliquées et `prisma generate` exécuté, les modules Civic et Jobs sont prêts pour un usage professionnel et scalable Afrique / international.
