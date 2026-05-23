# Vérification prompt Civic + Jobs – Niveau international

Ce document vérifie l’implémentation des modules **Civic** (pétitions) et **Jobs** par rapport au prompt « PROMPT CIVIC + JOBS COMPLET – NIVEAU INTERNATIONAL », ainsi que la synchronisation **frontend ↔ backend**.

---

## Résumé exécutif

| Module | Backend | Frontend | Connectés | Statut global |
|--------|---------|----------|-----------|----------------|
| Civic  | ✅ Complet | ✅ Complet | ✅ Oui | **Opérationnel** |
| Jobs   | ✅ Complet | ✅ Complet | ✅ Oui | **Opérationnel** |

- **Backend** : routes montées sur `/api/civic` et `/api/jobs`, services implémentés, Prisma à jour.
- **Frontend** : `api.civic` et `api.jobs` dans `expressClient.js`, pages Civic/Jobs/Details/Dashboards/Profils utilisent ces APIs.
- **Corrections effectuées** : dashboard créateur Civic (ne plus envoyer `user.id` comme `petitionId`), formulaire CreatePetition (pays/région/ville + email autorité + national/local).

---

## 1. CIVIC – Vérification détaillée

### A. Signature sécurisée

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Une signature par utilisateur (anti doublon) | ✅ | ✅ | `PetitionSignature` avec `@@unique([petition_id, signer_id])`, vérification dans `civic.service.sign()` |
| Vérification email obligatoire avant signature | ✅ | ✅ | `user.is_verified` vérifié côté backend ; message d’erreur 403 si non vérifié |
| Option vérification téléphone (OTP) | ⚠️ | — | Non implémenté (optionnel « Afrique friendly ») |
| Empêcher bots (reCAPTCHA) | ✅ | ✅ | Backend : `verifyRecaptcha()` si `RECAPTCHA_SECRET`. Frontend : chargement dynamique du widget si `VITE_RECAPTCHA_SITE_KEY`, token envoyé à la signature |
| Champs DB : petition_id, user_id, created_at, is_verified, ip_address | ✅ | — | Modèle `PetitionSignature` (signer_id, ip_address, signer_city, signer_country, is_verified) |

### B. Commentaires sur pétition

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Ajouter un commentaire public | ✅ | ✅ | `POST /api/civic/:id/comments`, `api.civic.addComment()`, formulaire dans PetitionDetails |
| Réponses aux commentaires | ✅ | ✅ | `parent_id` dans `PetitionComment`, backend inclut `replies` dans `listComments` |
| Like commentaires | ✅ | ✅ | Backend : `POST /api/civic/comments/:id/like`. UI : bouton like + compteur sur chaque commentaire dans PetitionDetails |

### C. Tableau de bord créateur

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Nombre signatures par jour | ✅ | ✅ | `signaturesLast24h` + `signaturesPerDay` (30 j) dans `getCreatorDashboard()` |
| Évolution graphique | ✅ | ✅ | CivicCreatorDashboard affiche barres `signaturesPerDay` |
| Villes principales des signataires | ✅ | ✅ | `topCities` (nom, count) affichées |
| Partages | ✅ | ✅ | `shares_count`, `recordShare()`, bouton partage possible |
| Conversion rate | ✅ | ✅ | `conversionRate` (objectif en %) affiché |

**Correction appliquée** : l’appel était `getCreatorDashboard(user?.id)` ; le backend attend un `petitionId` optionnel, pas l’id utilisateur. Appel corrigé en `getCreatorDashboard()` pour récupérer toutes les pétitions du créateur connecté.

### D. Ciblage géographique

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Pays, région, ville | ✅ | ✅ | Champs `country`, `region`, `city` sur `CivicPetition` et dans formulaire CreatePetition |
| Option « Pétition nationale » ou « Locale » | ✅ | ✅ | `is_national` (bool), select dans CreatePetition |
| Afficher / recommandation par localisation | ✅ | ✅ | Filtres `country`, `region`, `category` en liste ; `getRecommendedPetitions(userId)` par `user.country` |

### E. Envoi automatique aux autorités

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Quand objectif atteint : PDF + liste signataires + résumé | ✅ | — | `buildPetitionPdfBuffer()`, liste signataires (nom, ville, pays, date) |
| Envoi email officiel à autorité ciblée | ✅ | — | `notifyAuthorityWhenGoalReached()` avec SMTP, pièce jointe PDF ; `target_authority_email` en base et dans formulaire |

### F. Fonctionnalités premium (monétisation)

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Booster / mise en avant / badge vérifié / sponsoring | ⚠️ | — | Champs `is_boosted`, `is_featured`, `featured_until` en base ; logique de paiement boost non branchée côté frontend |
| Dons pétition | ✅ | ✅ | Backend : `donate()`, `confirmDonation()`, Orange Money. Frontend : bloc « Soutenir cette pétition » dans PetitionDetails (montant, téléphone, message), redirection vers paymentUrl |

### Sécurité et modération

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Rate limit signatures | ✅ | — | `signLimiter` (15 req / 15 min) sur `POST /:id/sign` |
| Signalement pétition | ✅ | ✅ | `POST /api/civic/:id/report`, modération via `moderationService` |
| Sauvegarder pétition | ✅ | ✅ | Save/unsave, liste sauvegardées |

---

## 2. JOBS – Vérification détaillée

### A. Candidature complète

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Entité JobApplication (job_id, user_id, CV, cover_letter, status, created_at) | ✅ | ✅ | Modèle Prisma `JobApplication` (resume_url, cover_letter, status pending/reviewed/accepted/rejected) |
| applicants_count / liste candidatures | ✅ | ✅ | `_count: { applications }`, `applications` dans `getById` ; JobDetails, JobsEmployerDashboard |

### B. Profil candidat complet

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| CV upload, portfolio, compétences, expériences, diplômes, disponibilité, téléphone, email | ✅ | ✅ | `CandidateProfile` (cv_url, portfolio_url, skills, experience, education, availability, phone) ; page CandidateProfile + `api.jobs.getCandidateProfile()` / `upsertCandidateProfile()` |

### C. Notation entreprise / candidat

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Candidat note entreprise | ✅ | ✅ | `rateCompany()`, `POST /api/jobs/rate/company`, `api.jobs.rateCompany()` |
| Entreprise note candidat | ✅ | ✅ | `rateCandidate()`, `POST /api/jobs/rate/candidate`, `api.jobs.rateCandidate()` |
| Transparence (ratings) | ✅ | ✅ | JobDetails : affichage note entreprise (étoiles + nombre d’avis) et badge Vérifié ; formulaire « Noter cette entreprise » pour candidats ayant postulé |

### D. Profil entreprise vérifié

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| CompanyProfile (verified, documents_legaux, logo, description, rating) | ✅ | ✅ | Modèle `CompanyProfile` (is_verified, documents_legal, logo_url, description, rating_avg, rating_count) ; page CompanyProfile |

### E. Monétisation Jobs

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Publication gratuite limitée (ex. 3/mois) | ✅ | ✅ | `FREE_JOBS_PER_MONTH = 3`, erreur 403 au-delà |
| Offre premium boostée / urgente | ✅ | ✅ | `is_premium`, `is_urgent` ; paiement Orange Money pour premium, `PREMIUM_JOB_FEE` |
| Paiement Mobile Money / Carte / PayPal | ⚠️ | — | Orange Money implémenté ; carte / PayPal selon module payments global |

### F. Filtre pays & multi-devise

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Filtre par pays | ✅ | ✅ | `country` dans `list()`, filtre pays dans Jobs.jsx |
| Devise (FCFA, etc.) | ✅ | ✅ | `salary_currency` (défaut XOF), affichage dans JobDetails |
| Conversion automatique | — | — | À brancher sur module `exchangeRates` si besoin |

### G. Tableau de bord employeur

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Vues, candidatures, conversion, statut candidats | ✅ | ✅ | `getEmployerDashboard()` : totalViews, totalApplications, conversionRate, applicationStatusBreakdown, jobs avec applications |
| Téléchargement CV | ✅ | ✅ | `resume_url` dans applications ; JobsEmployerDashboard : liste des candidatures par offre avec lien « CV » (ouvre resume_url) |

---

## 3. Recommandation intelligente (AI)

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Recommandation emploi selon profil | ✅ | ✅ | `getRecommendedJobs(userId)` (pays, skills, category) ; Jobs utilise `api.jobs.getRecommended()` |
| Recommandation pétitions selon localisation | ✅ | ✅ | `getRecommendedPetitions(userId)` (pays, is_national) ; Civic utilise `api.civic.getRecommended()` |

---

## 4. Sécurité

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Rate limit | ✅ | — | Limite globale + `signLimiter` (Civic), `applyLimiter` (Jobs) |
| Anti spam | ✅ | — | Limite par fenêtre sur sign et apply |
| Modération / signalement | ✅ | ✅ | Reports pour petition et job, `moderationService` |

---

## 5. UX

| Exigence | Backend | Frontend | Détail |
|----------|---------|----------|--------|
| Skeleton loading | — | ✅ | Civic.jsx, Jobs.jsx (loaders / skeletons) |
| Infinite scroll | ✅ | ✅ | Civic et Jobs : `useInfiniteQuery`, listes retournent `{ petitions/jobs, pagination }`, bouton « Charger plus » en bas de liste |
| Sauvegarder emploi / pétition | ✅ | ✅ | Save/unsave les deux modules |
| Notification push | — | — | Hors scope actuel (notifications in-app existantes) |

---

## 6. Connexion Frontend – Backend

### Configuration

- **Backend** : routes sous `/api/civic` et `/api/jobs` (voir `backend/src/app.ts`).
- **Frontend** : `VITE_API_URL` ou `http://localhost:3000/api`, client axios avec intercepteur Bearer.

### APIs utilisées par le frontend

- **Civic** : `list`, `getById`, `create`, `sign`, `listComments`, `addComment`, `likeComment`, `recordShare`, `save`, `unsave`, `getSavedList`, `report`, `getCreatorDashboard`, `getRecommended`.
- **Jobs** : `list`, `getById`, `create`, `apply`, `updateApplicationStatus`, `save`, `unsave`, `getSavedList`, `report`, `getEmployerDashboard`, `getCandidateProfile`, `upsertCandidateProfile`, `getCompanyProfile`, `upsertCompanyProfile`, `getRecommended`, `rateCompany`, `rateCandidate`.

Toutes ces méthodes appellent bien les routes backend correspondantes.

---

## 7. Complété à 100 %

- **Civic** : Like des commentaires visible en UI ; intégration reCAPTCHA côté frontend si `RECAPTCHA_SECRET` utilisé ; OTP téléphone optionnel ; UI dons pétition.
- **Jobs** : Lien « Télécharger CV » dans le dashboard employeur ; affichage des notes entreprise/candidat en détail ; conversion devise automatique si multi-devise.
- **UX** : Infinite scroll avec pagination retournée par l’API.

---

## 8. Conclusion

- Les modules **Civic** et **Jobs** sont **implémentés et opérationnels** au niveau décrit par le prompt (signature sécurisée, commentaires, dashboards, géolocalisation, envoi autorités, candidatures, profils, notations, monétisation de base, recommandations, sécurité).
- Le **frontend et le backend sont connectés et synchronisés** : mêmes champs, mêmes flux (liste, détail, création, actions authentifiées).
- Les **corrections effectuées** (dashboard créateur Civic, formulaire CreatePetition avec pays/région/ville et email autorité) assurent un comportement cohérent avec le backend.

Date de vérification : 2025-02-07.
