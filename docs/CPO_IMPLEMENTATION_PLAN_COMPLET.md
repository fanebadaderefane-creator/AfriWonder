# Plan d’implémentation complète — CPO 440 fonctionnalités

**Objectif :** Implémentation **complète** (backend + frontend + UX) de toutes les fonctionnalités listées dans `CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md`, pas seulement des traces.

**Légende :**
- ✅ **Complet** — Implémenté de bout en bout (schema, API, frontend, testable).
- 🔶 **Partiel** — Backend ou frontend seul ; à compléter.
- ⬜ **À faire** — À implémenter.

---

## Vue d’ensemble des vagues d’implémentation

| Vague | Périmètre | Priorité |
|-------|-----------|----------|
| **Vague 1** | Carrousel posts (2.5, 2.7), Historique activité (1.15) | Haute |
| **Vague 2** | Stories réactions/sondages (2.19, 2.21), Messagerie (4.17, 4.23, UI 4.7/4.21/4.22/4.16) | Haute |
| **Vague 3** | Vidéo STT (3.9), Lecture hors ligne (3.32), Réactions multiples UI (2.44) | Moyenne |
| **Vague 4** | Paiements (5.9, 5.23, 5.37, 5.39), Marketplace (6.18, 6.35–6.38) | Moyenne |
| **Vague 5** | Créateurs (7.19, 7.32), Mini-apps (8.25, exemples 8.11–8.19), Services (9.20, 9.22, 9.23, 9.25, 9.33) | Moyenne |
| **Vague 6** | Business (10.21, 10.31), Admin (11.19, 11.36), E2E (4.40) | Basse |

---

## 1. Compte utilisateur (35)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 1.1–1.14 | Création compte, login, profil, vérification, badges, niveau | ✅ | — |
| **1.15** | Historique d’activité | 🔶 | Exposer `GET /api/me/activity` avec événements (connexions, publications, achats) ; page Paramètres > Activité |
| 1.16–1.34 | Confidentialité, blocage, 2FA, export, préférences, adresses, cookies | ✅ | — |
| 1.35 | CGU / Politique | ✅ | — |

---

## 2. Réseau social (45)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 2.1–2.4, 2.8–2.18 | Followers, posts texte, commentaires, hashtags, explore, stories (base) | ✅ | — |
| **2.5** | Posts images (plusieurs) | ✅ | Modèle `PostImage` ; API create/update avec `images[]` ; UI Create (upload multi) + FeedPosts galerie |
| **2.7** | Carrousel multi-images | ✅ | Affichage carrousel (prev/next + points) dans FeedPosts quand post.images.length > 1 |
| 2.19 | Réactions aux stories | ⬜ | Modèle `StoryReaction` (story_id, user_id, emoji) ; API POST/GET ; UI sur story viewer |
| 2.20 | Sondages feed | ✅ | — |
| **2.21** | Sondages dans les stories | ⬜ | Modèle `StoryPoll` + `StoryPollVote` ; API ; UI création + affichage dans story |
| 2.22–2.45 | Groupes, communautés, événements, feed, signalement, etc. | ✅ ou 🔶 | 2.44 : réactiver boutons Love/Fire sur Accueil si souhaité (backend déjà prêt) |

---

## 3. Vidéo (50)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 3.1–3.8, 3.10–3.31, 3.33–3.50 | Upload, live, playlists, feed, qualité, analytics, etc. | ✅ ou 🔶 | — |
| **3.9** | Sous-titres automatiques (STT) | ⬜ | Intégration STT (ex. Whisper API ou partenaire) ; champ `subtitle_auto_generated` ; UI option « Générer sous-titres » |
| **3.32** | Lecture hors ligne | ⬜ | Téléchargement vidéo (stockage local / cache) ; lecture sans réseau ; droits selon créateur |

---

## 4. Messagerie (40)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 4.1–4.6, 4.8–4.15, 4.18–4.20, 4.24–4.39 | Chat, groupes, fichiers, stickers, réponses, appels, présence, etc. | ✅ ou 🔶 | — |
| **4.7** | Messages vocaux | 🔶 | Backend OK (type `voice`) ; **Frontend :** enregistrement micro, envoi, lecture (waveform) dans Chat |
| **4.16** | Messages éphémères | 🔶 | Backend OK (`is_ephemeral`, `expires_at`) ; **Frontend :** option « Disparaît après lecture » + masquage après expiration |
| **4.17** | Suppression pour tous | ⬜ | Champ `deleted_for_all_at` ; règle (ex. < 15 min) ; API `DELETE /api/messages/:id/for-everyone` ; UI « Supprimer pour tous » |
| **4.21** | Partage de localisation | 🔶 | Backend OK ; **Frontend :** bouton « Partager position », carte / lien dans bulle |
| **4.22** | Partage de contact | 🔶 | Backend OK (type `contact`) ; **Frontend :** sélection contact, envoi carte contact dans chat |
| **4.23** | Messages épinglés (1-1) | ⬜ | `Conversation.pinned_message_id` ; API PATCH conversation pin/unpin ; UI affichage message épinglé en haut |
| **4.40** | Chiffrement E2E | ⬜ | Optionnel ; protocole (Signal, etc.) ; gestion clés ; scope important |

---

## 5. Paiements (40)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 5.1–5.8, 5.10–5.22, 5.24–5.36, 5.38, 5.40 | Wallet, P2P, QR, factures, airtime, KYC, escrow, etc. | ✅ ou 🔶 | — |
| **5.9** | Cartes virtuelles | ⬜ | Intégration partenaire (ex. Stripe Issuing) ; modèle VirtualCard ; UI génération / liste |
| **5.23** | Transferts internationaux | ⬜ | Partenaires (Wave, etc.) ; conformité ; UI flux envoi international |
| **5.37** | Cagnotte collective | ⬜ | Modèle GroupWallet / Cagnotte ; objectif, contributeurs ; API + UI |
| **5.39** | Préautorisation carte | ⬜ | Stripe PaymentIntent capture later ; API + cas d’usage (réservation) |

---

## 6. Marketplace (45)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 6.1–6.17, 6.19–6.34, 6.39–6.45 | Boutiques, catalogue, panier, commandes, livraison, avis, etc. | ✅ ou 🔶 | — |
| **6.18** | Comparateur de prix | ⬜ | Page ou composant « Comparer » (même produit, plusieurs vendeurs) ; API comparaison |
| **6.35** | Enchères | ⬜ | Modèle Auction, Enchere ; enchérir ; clôture ; attribution |
| **6.36** | Négociation de prix | ⬜ | Demande de prix personnalisé ; vendeur accepte/refuse ; workflow |
| **6.37** | Précommandes | ⬜ | Produit « précommande » ; date de dispo ; paiement à la sortie ou acompte |
| **6.38** | Alertes prix / disponibilité | ⬜ | Modèle ProductAlert (user, product, type: price|stock) ; job + notifications |

---

## 7. Créateurs (35)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 7.1–7.18, 7.20–7.31, 7.33–7.35 | Studio, revenus, tips, abonnements, lives, etc. | ✅ ou 🔶 | — |
| **7.19** | Contrats et droits musicaux | ⬜ | Module « Droits / Musique » : référentiel titres, statut droits, lien avec vidéos |
| **7.32** | API créateur | ⬜ | Sous-ensemble public API : stats, contenus, revenus ; scope créateur ; doc |

---

## 8. Mini-applications (30)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 8.1–8.10, 8.20–8.24, 8.26–8.30 | Catalogue, installation, paiements, dev portal, etc. | ✅ ou 🔶 | — |
| **8.11–8.19** | Exemples (taxi, food, billetterie, e-learning, santé, etc.) | 🔶 | Exposer les services existants comme mini-apps du catalogue (entrées MiniApp + deep links) |
| **8.25** | Notes et avis mini-app | 🔶 | Schéma possible ; **Frontend :** notation + liste avis sur fiche mini-app |

---

## 9. Services quotidiens (35)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 9.1–9.19, 9.21, 9.24–9.32, 9.34–9.35 | Transport, food, colis, factures, santé, immobilier, emploi, etc. | ✅ ou 🔶 | — |
| **9.20** | Garde d’enfants / aide à la personne | ⬜ | Catégorie prestataires + page/fiche service |
| **9.22** | Co-voiturage | ⬜ | Modèle Trajet / Covoiturage ; proposition / recherche trajets |
| **9.23** | Location de véhicules | ⬜ | Partenariat ou catalogue locations ; réservation |
| **9.25** | Groupes d’achat | ⬜ | Commande groupée ; objectif quantité/prix ; participants |
| **9.33** | Alertes prix voyage | ⬜ | Alertes sur destination/dates ; notifications |

---

## 10. Outils business (35)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 10.1–10.20, 10.22–10.30, 10.32–10.35 | Page entreprise, pub, chatbot, facturation, etc. | ✅ ou 🔶 | — |
| **10.21** | Programmes fidélité (business) | ⬜ | Points / avantages par page business ; règles ; UI client |
| **10.31** | Réservation / RDV (page) | 🔶 | Lier Bookings à BusinessPage ; créneaux par page ; UI prise de RDV depuis page |

---

## 11. Outils administrateurs (40)

| CPO | Fonctionnalité | Statut | Tâches pour compléter |
|-----|----------------|--------|------------------------|
| 11.1–11.18, 11.20–11.35, 11.37–11.40 | Dashboard, modération, feature flags, audit, etc. | ✅ ou 🔶 | — |
| **11.19** | Kill switch | 🔶 | Désactivation d’urgence d’un module (feature flag extrême ou endpoint dédié) ; UI admin |
| **11.36** | A/B testing (admin) | ⬜ | Config expériences (segments, variantes) ; enregistrement affectation ; métriques |

---

## Ordre d’exécution recommandé

1. **Vague 1 (cette session)**  
   - 2.5 / 2.7 Carrousel (PostImage, API, Create + Feed)  
   - 1.15 Historique activité (API + page)

2. **Vague 2**  
   - 2.19 StoryReaction, 2.21 StoryPoll (schema, API, Stories UI)  
   - 4.17 Suppression pour tous, 4.23 Message épinglé 1-1 (schema, API, Chat UI)  
   - 4.7, 4.16, 4.21, 4.22 UI messagerie (vocaux, éphémères, localisation, contact)

3. **Vagues 3–6**  
   - Selon priorité produit ; chaque élément du tableau ci-dessus peut être pris comme ticket.

---

*Ce plan sera mis à jour au fur et à mesure des livraisons (statut ✅ lorsque la fonctionnalité est complète de bout en bout).*
