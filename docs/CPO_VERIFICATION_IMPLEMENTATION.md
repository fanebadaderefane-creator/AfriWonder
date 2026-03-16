# Vérification CPO — Fonctionnalités implémentées (300+)

**Date :** 2026-03-15  
**Référence :** `CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md`  
**Objectif :** Vérifier que les fonctionnalités listées sont présentes dans AfriWonder (backend + frontend).

---

## Synthèse par catégorie

| Catégorie | Implémenté | Total | Taux | Principales lacunes |
|-----------|-------------|-------|------|----------------------|
| 1. Compte utilisateur | ~33 | 35 | 94% | 1.15 (historique d’activité — API partielle) |
| 2. Réseau social | ~40 | 45 | 89% | 2.5, 2.7 (carrousel multi-images), 2.19, 2.21 (stories) |
| 3. Vidéo (TikTok/YouTube) | ~47 | 50 | 94% | 3.9 (STT sous-titres), 3.32 (lecture hors ligne) |
| 4. Messagerie | ~35 | 40 | 88% | 4.17 (suppression pour tous), 4.23 (messages épinglés en conv 1-1), 4.40 (E2E) |
| 5. Paiements | ~36 | 40 | 90% | 5.9, 5.23, 5.37, 5.39 |
| 6. Marketplace | ~39 | 45 | 87% | 6.18, 6.35, 6.36, 6.37, 6.38 |
| 7. Créateurs | ~33 | 35 | 94% | 7.19 (droits musicaux), 7.32 (API créateur) |
| 8. Mini-apps | ~27 | 30 | 90% | Exemples taxi/food/billetterie en mini-app, 8.25 (avis) |
| 9. Services quotidiens | ~29 | 35 | 83% | 9.20, 9.22, 9.23, 9.25, 9.33 |
| 10. Outils business | ~33 | 35 | 94% | 10.21 (fidélité business), 10.31 (RDV page) |
| 11. Outils admin | ~37 | 40 | 93% | 11.19 (kill switch), 11.36 (A/B testing) |

**Total estimé : ~389 / 440 fonctionnalités avec une trace claire (routes, services, schéma ou pages).**

---

## Détail des lacunes identifiées

### 1. Compte utilisateur (35)
- **1.15** — Historique d’activité : journal des actions récentes (connexions, publications, achats). *Partiel : route ou logique commentée / non exposée en API dédiée.*

### 2. Réseau social (45)
- **2.5** — Posts images : publication avec **plusieurs** photos (galerie).
- **2.7** — Carrousel (multi-images) : un post avec plusieurs images à faire défiler. *Schéma : `Post` a `image_url` (une seule), pas de modèle PostImage/carrousel.*
- **2.19** — Réactions aux stories (emoji sur une story).
- **2.21** — Sondages dans les stories (éphémère). *Pas de StoryPoll / story poll.*
- **2.44** — Réactions multiples (love, fire…) : *backend présent (`Like.type`, `reaction_type`) ; boutons Love/Fire retirés de l’écran Accueil uniquement.*

### 3. Vidéo (50)
- **3.9** — Sous-titres automatiques (STT) : *seul `subtitle_url` / sous-titres manuels.*
- **3.32** — Lecture hors ligne : *pas de flux de téléchargement pour lecture sans connexion.*

### 4. Messagerie (40)
- **4.7** — Messages vocaux : *backend : `message.service` gère le type `voice` et `audio` ; à confirmer côté frontend (envoi/lecture).*
- **4.16** — Messages éphémères : *backend : `is_ephemeral`, `expires_at` dans Message ; à confirmer UX.*
- **4.17** — Suppression pour tous : *pas de trace claire (suppression limitée dans le temps pour tous).*
- **4.21** — Partage de localisation : *backend : `location_lat`, `location_lng`, `location_label`, type `location` ; à confirmer frontend.*
- **4.22** — Partage de contact : *backend : type `contact` dans allowedTypes ; à confirmer frontend.*
- **4.23** — Messages épinglés (conversation 1-1) : *live : `pinChatMessage` existe ; pas d’équivalent explicite pour conv 1-1.*
- **4.40** — Chiffrement E2E : *non implémenté.*

### 5. Paiements (40)
- **5.9** — Cartes virtuelles.
- **5.23** — Transferts internationaux.
- **5.37** — Cagnotte collective.
- **5.39** — Préautorisation carte.

### 6. Marketplace (45)
- **6.18** — Comparateur de prix.
- **6.35** — Enchères.
- **6.36** — Négociation de prix.
- **6.37** — Précommandes.
- **6.38** — Alertes prix / disponibilité.

### 7. Créateurs (35)
- **7.19** — Contrats et droits musicaux (module dédié).
- **7.32** — API créateur dédiée (public API existe, pas de périmètre « créateur » explicite).

### 8. Mini-applications (30)
- **8.11–8.19** — Exemples intégrés (taxi, food, billetterie, e-learning, santé, assurance, micro-crédit) en tant que **mini-apps** du catalogue (les services existent en pages/routes dédiées, pas sous forme mini-app).
- **8.25** — Notes et avis sur une mini-app (schéma peut avoir rating ; UX à confirmer).

### 9. Services quotidiens (35)
- **9.20** — Garde d’enfants / aide à la personne.
- **9.22** — Co-voiturage.
- **9.23** — Location de véhicules.
- **9.25** — Groupes d’achat.
- **9.33** — Alertes prix voyage.

### 10. Outils business (35)
- **10.21** — Programmes fidélité (business).
- **10.31** — Réservation / RDV depuis la page entreprise (bookings existent pour services ; lien avec business page à clarifier).

### 11. Outils administrateurs (40)
- **11.19** — Kill switch (désactivation d’urgence) : *platformControl peut couvrir partiellement.*
- **11.36** — A/B testing (admin).

---

## Éléments déjà implémentés (souvent méconnus)

- **Messagerie :** types `voice`, `location`, `contact` ; `is_ephemeral` et `expires_at` dans le schéma et le service.
- **Réseau social :** `Post.visibility` = `close_friends` (2.45) ; `PostPoll` pour sondages feed (2.20) ; `BannedWord` pour mots interdits (2.43).
- **Vidéo :** `reaction_type` (like, love, fire) en base ; épingler un commentaire live ; vues qualifiées (schéma).
- **Compte :** `GET /api/me/activity` (1.15) mentionné dans CPO_IMPLEMENTATION_TRACKING (vague 2).

---

## Recommandations

1. **Priorité haute (impact UX)**  
   - Carrousel / posts multi-images (2.5, 2.7).  
   - Affichage et envoi des messages vocaux, localisation et contact en frontend (4.7, 4.21, 4.22) si backend prêt.  
   - Messages épinglés en conversation 1-1 (4.23) si souhaité.

2. **Priorité moyenne**  
   - Stories : réactions et sondages (2.19, 2.21).  
   - Lecture hors ligne vidéo (3.32).  
   - Sous-titres automatiques STT (3.9).  
   - Marketplace : alertes prix/dispo (6.38), précommandes (6.37).

3. **Priorité basse / optionnel**  
   - E2E messagerie (4.40).  
   - Enchères, négociation (6.35, 6.36).  
   - Mini-apps : exemples intégrés et avis (8.11–8.19, 8.25).  
   - Kill switch et A/B testing admin (11.19, 11.36).

---

*Ce document est une photographie de l’état du code (routes, services, schéma Prisma, pages). Les « partiels » ou « à confirmer » nécessitent un test manuel ou une revue frontend/API.*
