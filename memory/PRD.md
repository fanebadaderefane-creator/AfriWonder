# AfriWonder - Super-App Africaine (Expo Mobile)

## Vue d'ensemble
Super-application mobile pour l'Afrique de l'Ouest (Mali, Senegal, Cote d'Ivoire) replicant la PWA AfriWonder.

## Statut: FRONTEND MOCKEE (Backend sera connecte par l'utilisateur)

## Ecrans implementes (74 fichiers)

### Navigation principale (Tabs)
- [x] Accueil - Feed video TikTok-style
- [x] Explorer - Hub services + recherche
- [x] Creer - Creation de contenu
- [x] Market - Marketplace e-commerce
- [x] Profil - Profil utilisateur avec navigation complete

### Auth
- [x] Onboarding
- [x] Login
- [x] Register

### E-commerce
- [x] Produit detail (/product/[id])
- [x] Panier (/cart)
- [x] Checkout/Paiement (/checkout) - Orange Money, Wave, Moov Money
- [x] Commandes (/orders) - Historique + filtres
- [x] Detail commande (/orders/[id]) - Suivi livraison timeline
- [x] Favoris/Wishlist (/wishlist)

### Finance
- [x] Portefeuille (/wallet)
- [x] Microcredit (/wallet/microcredit) - Score credit, tiers de pret
- [x] Recharge wallet (/wallet/recharge) - Orange Money, Wave, carte

### Services
- [x] Hub services (/services) - 18 services
- [x] Livraison repas (/services/food)
- [x] Transport (/services/transport)
- [x] Sante/Telemedecine (/services/health)
- [x] Immobilier (/services/realestate)
- [x] Evenements (/services/events)
- [x] Emploi (/services/jobs)
- [x] Covoiturage (/services/covoiturage)
- [x] Location vehicules (/services/vehicle-rental)
- [x] Garde enfants (/services/childcare)
- [x] Voyage (/services/voyage)

### Social
- [x] Messages (/messages) + Chat (/messages/[id])
- [x] Notifications (/notifications)
- [x] Communautes (/communities) + Detail (/communities/[id])
- [x] Stories (/stories) - Vue + lecteur plein ecran
- [x] Decouvrir (/discover) - Sujets, createurs, stories
- [x] Recherche (/search) - Comptes, videos, categories

### Education
- [x] Formations (/courses) - Cours avec categories
- [x] Detail cours (/courses/[id]) - Modules, progression

### Contenu
- [x] Actualites (/news) - Articles par categorie
- [x] Detail article (/news/[id])
- [x] Live (/live) + Stream (/live/[id]) + Demarrer live (/live/start)

### Engagement
- [x] Crowdfunding (/crowdfunding) - Campagnes, progression
- [x] Civique (/civic) - Petitions, projets communautaires
- [x] Defis (/challenges) - Quotidiens, hebdomadaires, points
- [x] Parrainage (/referrals) - Code, niveaux, recompenses

### Vendeur
- [x] Dashboard vendeur (/seller)

### Outils
- [x] Mini-Apps Store (/miniapps)
- [x] Assistant IA (/assistant) - Chat simule

### Informations
- [x] Parametres (/settings) - Complet avec toggles
- [x] A propos (/about)
- [x] FAQ (/faq) - Accordeon
- [x] Support (/support-page) - Chat, email, tel
- [x] Conditions d'utilisation (/terms)
- [x] Politique de confidentialite (/privacy-policy)

## Architecture technique
- Framework: Expo + React Native + Expo Router
- Theme: Dark mode avec couleurs AfriWonder (orange #FF6B00)
- Donnees: 100% mockees en frontend
- Backend: Non connecte (utilisateur s'en charge)
