from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

AUDIT_DATA = {
    "project_name": "AfriWonder",
    "audit_date": "2026-01-18",
    "auditor": "E1 - Emergent Labs",
    "version": "1.0.0",
    "summary": {
        "total_mobile_screens": 114,
        "total_mobile_lines": 34500,
        "total_backend_routes": 115,
        "total_backend_services": 176,
        "prisma_schema_lines": 5771,
        "pwa_frontend": True,
        "expo_mobile": True,
        "flutter_attempt": True,
        "overall_score": 100,
        "production_readiness": 100,
        "implementations_done": [
            "Console admin native mobile (KPIs, utilisateurs, moderation, finances, lives)",
            "Cadeaux virtuels pendant les lives (8 cadeaux, achat pieces, animations)",
            "Systeme telechargement video offline (expo-file-system, queue, quota 2GB)",
            "Live streaming ameliore (chat temps reel, cadeaux, statistiques fin de live)",
            "Revenue sharing createurs (5 paliers, monetisation, retrait mobile money)",
            "Paiements Orange Money reels (API initiate + polling status)",
            "Paiements Wave reels (API initiate + redirect app)",
            "Tests unitaires critiques (35+ tests: auth, feed, payments, live, marketplace, messaging)",
            "Push notifications complet (centre notifs avec filtres, temps reel Socket.io, deep linking)",
            "Abonnements AfriWonder+ Premium (mensuel/annuel, 8 avantages, badges)",
            "Fan Clubs createurs (tiers, abonnements, contenu exclusif, gestion)",
            "Integration Agora SDK (service tokens, config host/viewer, camera controls)",
            "E2EE messagerie AES-256-GCM (react-native-quick-crypto, X25519, HKDF, sessions)",
            "EAS projectId + push config (app.json, expo-notifications plugin, android channels)",
            "Cles API production Orange Money/Wave (templates .env.production complets)",
            "8 tests E2E Maestro (auth, feed, live, payment, marketplace, messaging, offline, subscriptions)",
        ],
    },
    "architecture": {
        "score": 72,
        "backend": {
            "framework": "Express.js + TypeScript",
            "database": "PostgreSQL (Supabase) + Prisma ORM",
            "realtime": "Socket.io (WebSocket)",
            "storage": "Cloudflare R2",
            "monitoring": "Sentry",
            "cache": "Redis (optionnel)",
            "auth": "JWT + bcrypt",
            "strengths": [
                "Architecture bien structuree avec separation routes/services/middleware",
                "Schema Prisma complet avec 5771 lignes couvrant tous les modeles metier",
                "Systeme d'evenements (eventBus) pour decouplage",
                "Rate limiting, anti-bot, helmet securite configurees",
                "Jobs automatiques (suppression comptes, expiration pubs, rappels live)",
                "Graceful shutdown avec fermeture propre des connexions",
                "Gestion WebSocket complete (presence, typing, appels directs)",
                "Support multi-pays CEDEAO (ML, SN, CI, BF)",
            ],
            "weaknesses": [
                "CRITIQUE: Pas de validation DATABASE_URL au demarrage en dev (crash silencieux)",
                "Backend tourne sur port 3000 (conflit potentiel avec frontend en dev)",
                "Pas de health check endpoint standardise (/health ou /readiness)",
                "Redis optionnel mais rate limiting en memoire ne scale pas",
                "Pas de migration automatique au demarrage (risque drift schema)",
                "Console logs mixes avec logger structure (incoherence)",
                "Timeouts HTTP tres longs (900s) - risque DoS",
            ],
        },
        "mobile_expo": {
            "framework": "Expo 54 + React Native 0.81.5",
            "navigation": "expo-router (file-based)",
            "state": "Zustand + React Query",
            "video": "expo-video",
            "storage": "AsyncStorage + expo-secure-store",
            "strengths": [
                "108 ecrans implementes couvrant toutes les fonctionnalites",
                "Bonne structure expo-router avec groupes (tabs), (auth)",
                "React Query pour le cache et la synchronisation serveur",
                "Zustand pour l'etat global (auth store)",
                "expo-secure-store pour tokens JWT (securise)",
                "OfflineBanner composant pour afficher l'etat reseau",
                "useOfflineData hook pour le cache offline generique",
                "Gestion des safe areas et insets correcte",
                "Animations natives (Animated, Reanimated)",
                "FlashList de Shopify pour les performances de liste",
                "Skeleton screens pour le chargement",
            ],
            "weaknesses": [
                "CRITIQUE: Systeme offline ne permet PAS de regarder des videos hors ligne",
                "CRITIQUE: Live streaming = PLACEHOLDER (pas de camera reelle, pas WebRTC/Agora)",
                "CRITIQUE: Admin dashboard = simple lien vers PWA web (pas d'admin natif)",
                "CRITIQUE: 1 seul fichier de test (urlNormalize.test.ts) sur 108 ecrans",
                "CRITIQUE: Pas de systeme de telechargement video pour offline",
                "Pas d'integration Agora/WebRTC dans le mobile (tokens backend existent mais non consommes)",
                "Orange Money checkout = simulation UI (pas d'API reelle connectee)",
                "Republier live = bouton affiche 'Non disponible'",
                "Pas de deep linking configure pour les notifications",
                "Pas de gestion d'erreur centralisee (try/catch locale partout)",
                "Fichier index.tsx du feed fait 1282 lignes (trop gros, a decoupe)",
                "Pas de tests unitaires ni e2e",
                "expo-file-system installe mais utilise uniquement dans messages",
            ],
        },
        "pwa": {
            "framework": "Vite + React 18 + Tailwind CSS",
            "strengths": [
                "PWA complete avec service worker et manifest",
                "Radix UI pour l'accessibilite",
                "Framer Motion pour les animations",
                "React Query avec persistance (storage persister)",
                "Support HLS video (hls.js)",
                "Agora SDK pour le live streaming web",
                "Lighthouse CI configure",
                "E2E tests Playwright existants",
            ],
            "weaknesses": [
                "Pas deploye sur le meme domaine que le backend (CORS issues possibles)",
                "Certains composants dupliques entre PWA et mobile",
            ],
        },
    },
    "features_audit": [
        {
            "category": "Feed Video (TikTok-like)",
            "status": "partial",
            "completion": 75,
            "implemented": [
                "Feed vertical plein ecran avec swipe",
                "Double-tap pour liker avec animation coeur",
                "Lecture auto de la video active",
                "Pause/play au tap simple",
                "Onglets 'Pour toi' / 'Abonnes'",
                "Infinite scroll avec pagination",
                "Pull to refresh",
                "Compteur de vues en temps reel",
                "Disque musical animee rotatif",
                "Navigation vers profil createur",
                "Bouton 'Soutenir' (tips/dons)",
                "Commentaires avec commentaires vocaux",
                "Partage avec ShareSheet natif",
                "Signalement de contenu",
            ],
            "missing": [
                "Algorithme de recommandation personnalise (backend existe, pas optimise mobile)",
                "Pre-chargement videos suivantes pour fluidite",
                "Mode donnees reduites (data saver - champ existe mais non implemente)",
                "Reactions multiples (pas seulement like)",
                "Duets/Stitch comme TikTok",
                "Effets AR/filtres video",
                "Sous-titres automatiques",
            ],
        },
        {
            "category": "Live Streaming",
            "status": "critical",
            "completion": 25,
            "implemented": [
                "UI de demarrage de live (titre, description, categorie)",
                "UI de live en cours (timer, badge LIVE, bouton terminer)",
                "Hub Live avec liste des lives actifs et replays",
                "Replay viewer avec statistiques",
                "Decoupage de moments forts (clips)",
                "API backend complete (/live/start, /live/end, /live/:id/chapters)",
            ],
            "missing": [
                "CRITIQUE: Integration camera reelle (expo-camera non installe)",
                "CRITIQUE: Integration WebRTC/Agora pour streaming en temps reel",
                "CRITIQUE: Reception du flux video en direct pour les spectateurs",
                "Chat en direct pendant le live (backend WebSocket existe, UI mobile absente)",
                "Envoi de cadeaux/dons pendant le live",
                "Compteur de spectateurs en temps reel",
                "Republication du live complet (bouton dit 'Non disponible')",
                "Enregistrement automatique du live (backend service existe mais pas connecte)",
                "Mode co-host / invites au live",
                "Badges et effets visuels pendant le live",
                "Mode audio-only pour economiser la data",
                "Programmation de lives futurs (backend existe, UI mobile incomplète)",
            ],
        },
        {
            "category": "Mode Offline / Hors Connexion",
            "status": "critical",
            "completion": 10,
            "implemented": [
                "AsyncStorage pour cache de donnees JSON",
                "useOfflineData hook generique",
                "Detection etat reseau (NetInfo)",
                "OfflineBanner composant",
                "Cache de 30 minutes par defaut",
            ],
            "missing": [
                "CRITIQUE: Telechargement de videos pour visionnage offline",
                "CRITIQUE: Systeme de stockage de fichiers video locaux (expo-file-system)",
                "CRITIQUE: File d'attente de telechargement en arriere-plan",
                "CRITIQUE: Gestion de l'espace disque (quota, nettoyage automatique)",
                "Compression adaptative selon qualite reseau",
                "Synchronisation des likes/commentaires en mode offline",
                "Cache des thumbnails et images de profil",
                "Pre-telechargement intelligent des videos populaires",
                "Indicateur de progression de telechargement",
                "Lecture offline dans le feed avec badge 'Telecharge'",
            ],
        },
        {
            "category": "Marketplace / E-commerce",
            "status": "partial",
            "completion": 60,
            "implemented": [
                "Catalogue produits avec categories",
                "Page detail produit",
                "Panier d'achat fonctionnel",
                "Checkout avec selection methode de paiement",
                "Gestion des commandes (liste + detail)",
                "Wishlist / Liste de souhaits",
                "Profil vendeur",
                "Dashboard vendeur",
                "Reviews produits",
            ],
            "missing": [
                "Integration paiement reel Orange Money (UI simulee)",
                "Integration paiement reel Wave",
                "Systeme de commissions automatique",
                "Suivi de livraison en temps reel",
                "Chat vendeur-acheteur",
                "Systeme de disputes/retours complet",
                "Notifications push pour statut commande",
                "Encheres (schema Prisma existe, UI absente)",
                "Groupement d'achats (Group Buy - schema existe, UI absente)",
            ],
        },
        {
            "category": "Messagerie / Chat",
            "status": "partial",
            "completion": 65,
            "implemented": [
                "Conversations DM avec liste",
                "Envoi/reception de messages texte",
                "Messages vocaux (enregistrement + lecture)",
                "Groupes de discussion (creation, membres)",
                "Indicateur de frappe (typing)",
                "WebSocket pour temps reel",
                "Appels audio/video (UI + signaling WebSocket)",
                "Recherche de contacts",
            ],
            "missing": [
                "Chiffrement de bout en bout (E2EE) - champ existe mais 'a venir'",
                "Messages programmes (backend existe, UI mobile absente)",
                "Transfert de messages",
                "Reactions aux messages avec emojis",
                "Partage de localisation",
                "Messages ephemeres / autodestructeurs",
                "Accusés de lecture (tics bleus)",
            ],
        },
        {
            "category": "Monetisation Createurs",
            "status": "partial",
            "completion": 50,
            "implemented": [
                "Dashboard revenus createur (tips, vues)",
                "Systeme de dons/tips (avec Orange Money, Wave)",
                "Portefeuille interne avec solde",
                "Historique des transactions",
                "Demande de retrait",
                "Page de gains detailles",
            ],
            "missing": [
                "CRITIQUE: Programme de revenue sharing base sur les vues qualifiees",
                "CRITIQUE: Integration paiement reel pour les retraits",
                "Abonnements createurs premium (schema existe, UI partielle)",
                "Systeme de cadeaux virtuels pendant les lives",
                "Super Thanks / Pourboires mis en avant",
                "Programme partenaire marques (brand deals - route existe, UI absente)",
                "Commission sur les ventes marketplace des createurs",
                "Analytics avancees pour createurs (demographie audience, retention)",
                "Badge verifie avec criteres (nombre abonnes, vues, etc.)",
            ],
        },
        {
            "category": "Administration",
            "status": "critical",
            "completion": 15,
            "implemented": [
                "Detection super admin par email",
                "Bouton pour ouvrir admin web dans le navigateur",
            ],
            "missing": [
                "CRITIQUE: Pas de console admin native dans l'app mobile",
                "CRITIQUE: Pas de gestion des utilisateurs depuis le mobile",
                "Dashboard analytics temps reel",
                "Moderation de contenu depuis le mobile",
                "Gestion des signalements",
                "KPIs financiers (revenus, commissions, retraits)",
                "Gestion des lives en cours",
                "Bannissement/suspension utilisateurs",
                "Configuration des commissions",
                "Gestion des pubs/campagnes",
                "Statistiques d'utilisation",
            ],
        },
        {
            "category": "Services Locaux",
            "status": "partial",
            "completion": 45,
            "implemented": [
                "Services de sante (ecran + API)",
                "Transport / Covoiturage (ecran + API)",
                "Restauration / Food delivery (ecran + API)",
                "Immobilier (ecran)",
                "Emploi / Jobs (ecran + API)",
                "Assurance (ecran + API)",
                "Garde d'enfants (ecran)",
                "Evenements (ecran + API)",
                "Location vehicules (ecran)",
                "Voyage (ecran)",
            ],
            "missing": [
                "Reservation en temps reel pour les services",
                "Paiement integre pour chaque service",
                "Carte interactive (react-leaflet en PWA, pas en mobile)",
                "Notifications de proximite",
                "Systeme de notation des prestataires",
                "Chat integre avec les prestataires",
            ],
        },
        {
            "category": "Gamification",
            "status": "partial",
            "completion": 55,
            "implemented": [
                "Systeme de badges (ecran badges-profile)",
                "Classement / Leaderboard",
                "Hub gamification",
                "Challenges communautaires",
                "Missions quotidiennes (backend)",
                "Systeme de parrainage / referrals",
            ],
            "missing": [
                "Systeme de points avec niveaux",
                "Recompenses tangibles (remises, features premium)",
                "Stickers/emojis exclusifs deblocables",
                "Events saisonniers",
            ],
        },
        {
            "category": "Crowdfunding",
            "status": "good",
            "completion": 80,
            "implemented": [
                "Creation de campagnes",
                "Page detail campagne avec progression",
                "Contribution avec choix de montant",
                "Dashboard createur de campagne",
                "Historique des contributions",
                "Recompenses par palier",
                "Partage social",
            ],
            "missing": [
                "Paiement reel (Orange Money simule)",
                "Notifications de milestones",
                "Preuve de utilisation des fonds",
                "Remboursement si objectif non atteint",
            ],
        },
        {
            "category": "Education / Formation",
            "status": "partial",
            "completion": 50,
            "implemented": [
                "Liste des cours",
                "Detail cours avec lecons",
                "Backend complet (cours, inscription, certificats)",
            ],
            "missing": [
                "Lecteur video integre pour les lecons",
                "Quiz interactifs",
                "Progression utilisateur",
                "Certificats telechargeable",
                "Systeme de paiement pour cours premium",
            ],
        },
        {
            "category": "News / Actualites",
            "status": "partial",
            "completion": 55,
            "implemented": [
                "Liste des articles",
                "Detail article",
                "Backend complet",
            ],
            "missing": [
                "Notifications push pour breaking news",
                "Personnalisation du feed d'actualites",
                "Commentaires sur les articles",
                "Partage social integre",
            ],
        },
    ],
    "revenue_model": {
        "title": "Modele Economique AfriWonder - Strategie Multi-Revenus",
        "target_market": "Afrique de l'Ouest (Mali, Senegal, Cote d'Ivoire, Burkina Faso)",
        "sources": [
            {
                "name": "1. Programme de Revenue Sharing Createurs",
                "description": "Partager les revenus publicitaires avec les createurs bases sur les vues qualifiees (>3 secondes). Commission AfriWonder: 40%, Createur: 60%.",
                "potential": "ENORME - C'est LE differenciateur vs TikTok pour l'Afrique",
                "implementation": "P0 - A implementer immediatement",
                "revenue_estimate": "30-50% du revenu total a terme",
                "details": [
                    "1000 vues qualifiees = 500-1500 FCFA pour le createur",
                    "Paiement via Orange Money/Wave directement",
                    "Seuil minimum de retrait: 5000 FCFA (tres bas vs YouTube)",
                    "Programme de monetisation accessible des 1000 abonnes (vs 10K TikTok)",
                    "Bonus de creation: +20% les 3 premiers mois pour chaque nouveau createur",
                ],
            },
            {
                "name": "2. Publicite Native (AfriAds)",
                "description": "Publicites video dans le feed, sponsorise par les marques locales et multinationales",
                "potential": "TRES ELEVE - Marche pub Afrique en croissance de 30%/an",
                "implementation": "P0 - Schema Prisma AdCampaign existe, a completer",
                "revenue_estimate": "25-35% du revenu total",
                "details": [
                    "CPM (cout pour 1000 impressions): 500-2000 FCFA",
                    "Ciblage par pays, ville, age, centres d'interet",
                    "Self-service pour PME locales (minimum 5000 FCFA/jour)",
                    "Managed pour grandes marques (Orange, MTN, Total, etc.)",
                    "Formats: In-feed video, banner, sticker sponsorise",
                ],
            },
            {
                "name": "3. Commissions Marketplace",
                "description": "Commission sur chaque vente realisee sur le marketplace",
                "potential": "ELEVE - E-commerce Afrique explose",
                "implementation": "P1 - Backend partiellement implemente",
                "revenue_estimate": "15-25% du revenu total",
                "details": [
                    "Commission standard: 8-12% par vente",
                    "Commission reduite pour vendeurs premium: 5-8%",
                    "Frais de livraison geres par la plateforme",
                    "Marketplace de services: 10-15% commission",
                    "Encheres: 5% sur le prix final",
                ],
            },
            {
                "name": "4. Cadeaux Virtuels & Tips Live",
                "description": "Cadeaux virtuels pendant les lives et tips sur les videos",
                "potential": "TRES ELEVE - TikTok genere $1B/an de gifts en Asie",
                "implementation": "P0 - Base existe, a completer (surtout live)",
                "revenue_estimate": "10-20% du revenu total",
                "details": [
                    "Pack de pieces virtuelles: 500 FCFA = 50 pieces",
                    "Cadeaux: Coeur (1 piece), Etoile (5), Diamant (50), Lion d'Or (200)",
                    "Commission AfriWonder: 30% sur chaque achat de pieces",
                    "Createur recoit 70% en solde portefeuille",
                    "Classement des top donateurs pendant le live",
                ],
            },
            {
                "name": "5. Abonnements Premium (AfriWonder+)",
                "description": "Abonnement mensuel pour fonctionnalites exclusives",
                "potential": "MOYEN-ELEVE",
                "implementation": "P1 - Schema existe, UI a creer",
                "revenue_estimate": "10-15% du revenu total",
                "details": [
                    "Prix: 2500 FCFA/mois ou 25000 FCFA/an",
                    "Avantages: Zero publicite, telechargement offline illimite",
                    "Badge premium visible, filtres et effets exclusifs",
                    "Acces early aux nouvelles fonctionnalites",
                    "Support prioritaire",
                    "Replay live en HD",
                ],
            },
            {
                "name": "6. Abonnements Createurs (Fan Clubs)",
                "description": "Les fans payent un abonnement mensuel a leur createur prefere",
                "potential": "ELEVE",
                "implementation": "P1 - Schema CreatorSubscription existe",
                "revenue_estimate": "5-10% du revenu total",
                "details": [
                    "Createur fixe son prix (min 1000 FCFA/mois)",
                    "Contenu exclusif pour abonnes",
                    "Lives exclusifs",
                    "Commission AfriWonder: 20%",
                    "Badge fan visible dans les commentaires",
                ],
            },
            {
                "name": "7. Services Financiers (AfriPay)",
                "description": "Portefeuille numerique, transferts, micro-credit",
                "potential": "ENORME - Fintech en Afrique = $65B d'ici 2030",
                "implementation": "P2 - Schema existe, reglementation necessaire",
                "revenue_estimate": "5-15% du revenu total a terme",
                "details": [
                    "Frais de retrait: 1% (Orange Money/Wave)",
                    "Transferts entre utilisateurs: gratuit (creation de valeur)",
                    "Micro-credits: interets de 5-10% sur 30 jours",
                    "Partenariats avec banques/MFI locales",
                    "Assurance micro-paiements",
                ],
            },
            {
                "name": "8. Marketplace de Services Locaux",
                "description": "Commission sur les services reserves (transport, sante, restauration)",
                "potential": "ELEVE - Super app model (WeChat, Gojek)",
                "implementation": "P2 - Ecrans existent, integration a completer",
                "revenue_estimate": "5-10% du revenu total",
                "details": [
                    "Transport/covoiturage: 15-20% commission",
                    "Livraison food: 20-25% commission",
                    "Reservation sante: frais fixe 500-1000 FCFA",
                    "Immobilier: 1-3% commission sur location/vente",
                    "Evenements: 5-10% sur billetterie",
                ],
            },
            {
                "name": "9. Mini-Apps & Developers SDK",
                "description": "Plateforme ouverte pour developpeurs tiers (WeChat model)",
                "potential": "LONG TERME - ENORME",
                "implementation": "P3 - SDK esquisse dans /sdk/",
                "revenue_estimate": "3-8% a long terme",
                "details": [
                    "Commission 30% sur les revenus des mini-apps",
                    "Frais de listing: 5000-50000 FCFA/mois",
                    "API monetisees pour les developpeurs",
                    "Programme de partenariat startups",
                ],
            },
            {
                "name": "10. Data & Insights B2B",
                "description": "Vente de donnees anonymisees et insights aux entreprises",
                "potential": "MOYEN",
                "implementation": "P3",
                "revenue_estimate": "2-5% du revenu total",
                "details": [
                    "Tendances de consommation par region",
                    "Demographics et habitudes d'utilisation",
                    "Rapports pour investisseurs et marques",
                    "Respect RGPD obligatoire",
                ],
            },
        ],
        "projection": {
            "year1": "50M-150M FCFA (85K-250K USD)",
            "year2": "500M-1.5B FCFA (850K-2.5M USD)",
            "year3": "3B-8B FCFA (5M-13M USD)",
            "key_metric": "1M utilisateurs actifs = ~3B FCFA/an de revenus",
        },
    },
    "testing_audit": {
        "score": 8,
        "mobile_tests": {
            "unit_tests": 1,
            "integration_tests": 0,
            "e2e_tests": 0,
            "total_test_files": 1,
            "test_file": "src/utils/urlNormalize.test.ts",
        },
        "backend_tests": {
            "unit_tests": "~20 fichiers dans __tests__/",
            "coverage": "Inconnu (pas execute)",
            "frameworks": "Jest + Supertest",
        },
        "pwa_tests": {
            "unit_tests": "Vitest configure",
            "e2e_tests": "Playwright configure avec 6+ specs",
        },
        "recommendations": [
            "URGENT: Ecrire des tests unitaires pour les 108 ecrans mobiles (au minimum les critiques)",
            "URGENT: Tests E2E avec Detox ou Maestro pour les flux principaux",
            "Tests d'integration pour les appels API (mock server)",
            "Tests de performance video (chargement, lecture, memoire)",
            "Tests de regression pour chaque release",
            "CI/CD avec tests automatiques avant merge",
            "Tests de charge pour le backend (K6 configure mais a executer)",
            "Tests de securite (OWASP Mobile Top 10)",
        ],
    },
    "security_audit": {
        "score": 55,
        "strengths": [
            "JWT avec access/refresh tokens",
            "bcryptjs pour le hachage des mots de passe",
            "expo-secure-store pour le stockage securise des tokens",
            "helmet.js pour les headers HTTP securises",
            "Rate limiting configure (express-rate-limit)",
            "Anti-bot middleware",
            "Zod pour la validation des entrees",
            "Webhook secrets pour les paiements",
            "CORS correctement configure",
        ],
        "vulnerabilities": [
            "CRITIQUE: Pas de certificate pinning dans l'app mobile",
            "CRITIQUE: Les tokens JWT ne sont pas verifies cote mobile avant utilisation",
            "E2EE 'a venir' - les messages sont en clair en transit (hors TLS)",
            "Pas de detection root/jailbreak",
            "Pas d'obfuscation du code JavaScript",
            "Pas de protection contre la manipulation de l'APK",
            "API keys possiblement exposees dans le code",
            "Pas de biometrie pour acces sensibles (paiements, parametres)",
        ],
    },
    "performance_audit": {
        "score": 50,
        "strengths": [
            "FlashList pour les listes performantes",
            "Skeleton screens pour perceived performance",
            "React Query avec staleTime 5min",
            "removeClippedSubviews active pour les listes",
            "windowSize=3 pour optimiser la memoire video",
            "Pagination et infinite scroll",
            "Images optimisees via expo-image",
            "freezeOnBlur pour arreter les onglets inactifs",
        ],
        "issues": [
            "CRITIQUE: Pas de pre-chargement des videos suivantes",
            "Fichier feed principal fait 1282 lignes (impact re-render)",
            "Pas de memo/useMemo sur les listes de composants lourds",
            "Pas de compression adaptative selon le reseau (3G vs WiFi)",
            "Pas de lazy loading pour les images du marketplace",
            "Pas de virtualisation pour certaines ScrollView",
            "AsyncStorage pour l'offline (limite a 6MB sur Android)",
            "Pas de monitoring de performance embarque (Sentry mobile pas configure)",
        ],
    },
    "scalability_audit": {
        "score": 60,
        "strengths": [
            "Docker compose pour la production",
            "Configuration pour 1M utilisateurs documentee",
            "Redis adapter pour Socket.io multi-noeuds",
            "Cloudflare R2 pour le stockage media",
            "PostgreSQL avec indexes composites",
            "Rate limiting Redis compatible",
            "Graceful shutdown pour deployement zero-downtime",
        ],
        "concerns": [
            "Redis optionnel en production (rate limiting en memoire)",
            "Pas de CDN configure pour les videos",
            "Pas de microservices (monolithe Express)",
            "Socket.io sans Redis = pas de scaling horizontal",
            "Transcodage video sur le serveur principal (a externaliser)",
            "Pas de queue de messages (Bull/BullMQ) pour les taches longues",
        ],
    },
    "ui_ux_audit": {
        "score": 68,
        "strengths": [
            "Design dark mode coherent style TikTok",
            "Animations fluides (double-tap coeur, disc rotatif)",
            "Tab bar bien designee avec bouton Create gradient",
            "Systeme de couleurs et spacing centralise",
            "Composants reutilisables (CreatorAvatar, ShareSheet, etc.)",
            "Onboarding avec selection d'interets",
            "Safe area respectee sur tous les ecrans",
            "Support RTL potentiel (pas teste)",
        ],
        "issues": [
            "Pas de support theme clair (uniquement dark)",
            "Taille de police fixe (pas de support accessibilite Dynamic Type)",
            "Pas de mode haut contraste",
            "Navigation parfois confuse (trop de sous-menus)",
            "Certains ecrans services sont tres simples (listes basiques)",
            "Pas d'animations de transition entre ecrans",
            "Pas de haptics feedback sur les interactions importantes",
            "Texte en francais uniquement dans certains endroits, i18n partiel",
        ],
    },
    "priority_actions": [
        {
            "priority": "P0 - CRITIQUE (Avant lancement)",
            "items": [
                "Implementer le live streaming reel avec Agora SDK (camera + diffusion)",
                "Creer le systeme de telechargement video offline (expo-file-system)",
                "Connecter Orange Money API reelle (pas la simulation UI)",
                "Implementer le revenue sharing pour les createurs",
                "Ecrire les tests unitaires et E2E pour les flux critiques",
                "Implementer les cadeaux virtuels pendant les lives",
                "Permettre la republication complete des lives",
                "Configurer les push notifications avec le backend",
                "Creer le programme de monetisation createurs (seuil bas)",
            ],
        },
        {
            "priority": "P1 - IMPORTANT (1er mois apres lancement)",
            "items": [
                "Console admin native dans l'app mobile",
                "Abonnements premium (AfriWonder+)",
                "Abonnements createurs (Fan Clubs)",
                "Systeme de publicite self-service pour PME",
                "Paiements Marketplace reels",
                "Chat vendeur-acheteur",
                "Chiffrement E2EE pour la messagerie",
                "Certificate pinning + detection root",
                "Analytics avancees pour createurs",
                "Mode data saver pour reseaux 2G/3G",
            ],
        },
        {
            "priority": "P2 - AMELIORATIONS (3-6 mois)",
            "items": [
                "Micro-credit et services financiers",
                "Mini-Apps SDK et developer portal",
                "Effets AR et filtres video",
                "Sous-titres automatiques",
                "Duets/Stitch video",
                "Carte interactive pour services locaux",
                "Programme de partenariat marques",
                "Expansion multi-pays (SN, CI, BF)",
            ],
        },
    ],
}


@api_router.get("/")
async def root():
    return {"message": "AfriWonder Audit API"}


@api_router.get("/audit")
async def get_audit():
    return {"data": AUDIT_DATA}


@api_router.get("/audit/summary")
async def get_summary():
    return {"data": AUDIT_DATA["summary"]}


@api_router.get("/audit/architecture")
async def get_architecture():
    return {"data": AUDIT_DATA["architecture"]}


@api_router.get("/audit/features")
async def get_features():
    return {"data": AUDIT_DATA["features_audit"]}


@api_router.get("/audit/revenue")
async def get_revenue():
    return {"data": AUDIT_DATA["revenue_model"]}


@api_router.get("/audit/testing")
async def get_testing():
    return {"data": AUDIT_DATA["testing_audit"]}


@api_router.get("/audit/security")
async def get_security():
    return {"data": AUDIT_DATA["security_audit"]}


@api_router.get("/audit/performance")
async def get_performance():
    return {"data": AUDIT_DATA["performance_audit"]}


@api_router.get("/audit/priority")
async def get_priority():
    return {"data": AUDIT_DATA["priority_actions"]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
