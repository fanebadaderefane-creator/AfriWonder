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

## 4. Marché

- **Population africaine** : plus de 1,4 milliard de personnes  
- **Utilisateurs Internet** : plus de 600 millions  

Marché considérable pour une plateforme locale.

---

## 5. Modèle économique

| Source | Description |
|--------|--------------|
| **Publicité** | Comme Facebook, TikTok |
| **Commission marketplace** | 5 % à 10 % sur les ventes |
| **Dons et abonnements créateurs** | Comme YouTube, TikTok |
| **Paiement numérique** | Commission sur les transactions |
| **Services premium** | Comptes vérifiés, promotion de contenu, outils créateurs |

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
