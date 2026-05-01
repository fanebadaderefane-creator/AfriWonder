# AfriWonder — Contenu prêt à coller dans Play Console

Tous les champs requis par la fiche Play Store, prêts à copier/coller. Adapte les emails, URLs et éventuels noms de villes si besoin.

---

## 1. Informations de base

| Champ | Valeur |
|---|---|
| **Nom de l'app** | `AfriWonder` |
| **Nom du package** | `com.afriwonder.app` |
| **Catégorie principale** | `Social` |
| **Catégorie secondaire** (optionnelle) | `Style de vie` |
| **Tags / Thèmes** | `Social`, `Communication`, `Style de vie`, `Afrique`, `Mali` |
| **Ads dans l'app** | `Non` |
| **Achats in-app** | `Oui — AfriCoin via Google Play Billing` |
| **Public cible** | `13 ans et plus` |

---

## 2. URLs publiques (obligatoires Play Console)

Ces URLs sont servies par le **backend** via `backend/src/routes/publicPages.routes.ts`. Remplace `afriwonder-api.onrender.com` par ton domaine backend réel au moment de la soumission.

| Champ | URL |
|---|---|
| **Privacy Policy URL** | `https://afriwonder-api.onrender.com/privacy` |
| **Terms of Service URL** (optionnel) | `https://afriwonder-api.onrender.com/terms` |
| **Account Deletion URL** | `https://afriwonder-api.onrender.com/account/delete` |
| **Website URL** (optionnel) | `https://afriwonder-api.onrender.com/` |
| **Support email** | `support@afriwonder.com` |

> 💡 Si tu as un domaine personnalisé (ex. `afriwonder.com`), configure un reverse-proxy ou redirection pour que `/privacy`, `/terms`, `/account/delete` de ton domaine pointent vers le backend. Les URLs **doivent être en HTTPS**.

---

## 3. Description courte (80 caractères max)

**Français :**
```
La super-app africaine : vidéos, messages, paiements, services locaux.
```
*(69 caractères — ok)*

**Alternative :**
```
Réseau social, vidéos, paiements mobiles et services locaux africains.
```
*(71 caractères — ok)*

---

## 4. Description longue (4000 caractères max)

```
AfriWonder est la super-app pensée pour l'Afrique : un seul compte pour le social, la messagerie, le paiement mobile, la marketplace et les services locaux.

💬 Restez connectés
• Messagerie chiffrée de bout en bout (vos messages privés restent privés)
• Appels audio et vidéo en haute qualité, même en connexion faible
• Groupes, communautés, stickers, messages vocaux
• Stories, publications photo et vidéo, live streaming

📹 Créez et regardez
• Fil vidéo vertical optimisé pour les petits écrans et les réseaux lents
• Publiez des vidéos courtes, rejoignez des défis, monétisez votre audience
• Live streaming avec cadeaux virtuels et chat en direct
• Recommandations personnalisées basées sur vos goûts

💳 Payez et transférez en toute sécurité
• Compatible Orange Money, Wave et cartes bancaires (Stripe)
• Envoi d'argent instantané entre utilisateurs AfriWonder
• Portefeuille avec historique détaillé et cashback AfriCoin
• Paiements sécurisés par chiffrement SSL/TLS

🛍️ Marketplace africaine
• Découvrez des produits vendus par des commerçants africains
• Panier, paiement sécurisé, suivi de commande
• Avis vérifiés, questions aux vendeurs, garantie de satisfaction
• Abonnements premium pour les vendeurs

🚗 Services locaux (Mali et Afrique)
• Transport et covoiturage
• Livraison de repas (restaurants locaux)
• Santé : téléconsultation, pharmacies de garde
• Immobilier : location et vente
• Événements : billetterie locale
• Emplois : offres et candidatures
• Garde d'enfants, location de véhicules, voyages

🌍 Crowdfunding
• Soutenez des projets africains qui comptent
• Créez votre propre cagnotte en quelques minutes

🎓 Apprentissage
• Formations en ligne locales et internationales
• Actualités africaines vérifiées
• Assistant IA pour vous aider au quotidien

🔒 Votre sécurité, notre priorité
• Mots de passe chiffrés, authentification à deux facteurs
• Contrôle total sur vos données personnelles
• Suppression de compte en un clic depuis les Paramètres
• Respect strict du RGPD et de la loi malienne sur la protection des données

🌐 Conçu pour l'Afrique
• Fonctionne en 3G et réseaux instables
• Interface en français, optimisée pour les téléphones bas de gamme
• Support client local par email et dans l'app
• Fier de soutenir les créateurs, commerçants et travailleurs africains

Téléchargez AfriWonder et rejoignez la communauté africaine qui construit l'avenir numérique du continent.

Support : support@afriwonder.com
Politique de confidentialité : https://afriwonder-api.onrender.com/privacy
```

*(environ 2 400 caractères — bien en-dessous des 4 000)*

---

## 5. Assets graphiques à préparer

| Asset | Dimensions | Format | Obligatoire | Notes |
|---|---|---|---|---|
| Icône de l'app | 512×512 | PNG 32-bit (avec alpha) | ✅ | Carré ou adaptatif. Déjà dans `frontend/assets/images/icon.png` — vérifier la taille |
| Feature graphic | 1024×500 | PNG ou JPG | ✅ | Image de bannière en haut de ta fiche |
| Captures d'écran téléphone | min 2, max 8 | PNG ou JPG, 16:9 ou 9:16 | ✅ | 1080×1920 recommandé |
| Captures d'écran tablette 7" | min 2 | PNG ou JPG | ⚪ | Optionnel si tu ne vises pas tablette |
| Captures d'écran tablette 10" | min 2 | PNG ou JPG | ⚪ | Optionnel |
| Vidéo YouTube (promo) | 30 s à 2 min | URL YouTube | ⚪ | **Fortement recommandé** pour une super-app |

### Captures d'écran à prendre (ordre suggéré)

1. **Feed principal** — vidéos verticales
2. **Profil utilisateur** — avec avatar, bio, followers
3. **Messagerie** — liste de conversations + bulle E2EE
4. **Wallet** — solde + transfert + historique
5. **Marketplace** — produits
6. **Live streaming** — créateur en direct avec cadeaux
7. **Services locaux** — page restaurants ou médecins
8. **Crowdfunding** — projet en campagne

### Outils pour générer les assets

- **Captures** : scanner le QR de `expo start` avec un Android en mode dev → captures natives
- **Feature graphic** : Figma, Canva, GIMP — template gratuit `1024 × 500 px` sur Canva "Google Play feature graphic"
- **Icône** : si déjà prête dans `frontend/assets/images/icon.png`, vérifier résolution :
  ```bash
  file frontend/assets/images/icon.png
  ```
- **Vidéo promo** : Filmer un parcours feed + live + paiement, max 1 min, upload YouTube en **non répertorié** et mettre l'URL dans Play Console

---

## 6. Data Safety form — récapitulatif à remplir

Suis cet ordre dans Play Console → App content → Data safety.

### Collecte et partage

**Catégorie : Personal info**
- Name → ✅ Collected, ✅ Shared (avec Orange Money/Wave/Stripe pour paiement)
- Email → ✅ Collected, ❌ Not shared
- Phone number → ✅ Collected, ❌ Not shared
- Address → ✅ Collected (livraisons marketplace), ✅ Shared avec vendeurs pour livraison

**Catégorie : Financial info**
- User payments info → ✅ Collected (token de carte, pas le numéro complet), ✅ Shared avec Stripe
- Purchase history → ✅ Collected

**Catégorie : Messages**
- Messages in app → ✅ Collected, ❌ Not shared (E2EE : même nous ne pouvons pas les lire)

**Catégorie : Photos and videos**
- Photos, Videos → ✅ Collected (uploads utilisateur), ❌ Not shared

**Catégorie : Audio files**
- Voice or sound recordings → ✅ Collected (messages vocaux), ❌ Not shared

**Catégorie : Files and docs**
- Files and docs → ❌ Not collected (on ne reçoit pas de PDF/docs)

**Catégorie : Location**
- Approximate location → ✅ Collected (services locaux)
- Precise location → ✅ Collected (services locaux, transport)

**Catégorie : Contacts**
- Contacts → ✅ Collected (opt-in pour trouver des amis, hash local seulement)

**Catégorie : App activity**
- App interactions → ✅ Collected (recommandations)
- In-app search history → ✅ Collected
- Installed apps → ❌ Not collected
- Other user-generated content → ✅ Collected (posts, stories)

**Catégorie : Web browsing** → ❌ Not collected

**Catégorie : App info and performance**
- Crash logs → ✅ Collected (Sentry, anonymisé)
- Diagnostics → ✅ Collected (performance)

**Catégorie : Device or other IDs**
- Device or other IDs → ✅ Collected (push token FCM)

### Security practices

- Data encrypted in transit ? **Yes** (HTTPS + E2EE messages)
- Users can request data deletion ? **Yes** (lien : `https://afriwonder-api.onrender.com/account/delete` + in-app)
- Does this app use Google Play's Data safety section standards ? **Yes**

### Committed to Play Families Policy ? 
- **No** (AfriWonder n'est pas conçu pour les enfants — âge minimum 13 ans)

---

## 7. Classification IARC (App content → Content rating)

Sélectionne **"Social Networking"** dans la liste, puis réponds aux ~15 questions. Réponses recommandées pour AfriWonder :

- Violence, sang, gore : **Non**
- Contenu sexuel / nudité : **Non** (modération en place via `bannedWord.service.ts`)
- Langage choquant : **Non** (modération)
- Drogue, alcool, tabac : **Non**
- Jeux d'argent : **Non**
- Peur / horreur : **Non**
- Crude humour : **Non**
- Localisation utilisateur partagée publiquement : **Non** (localisation stockée localement pour suggestions)
- Contenu généré par les utilisateurs (UGC) : **Oui** → filtres + reporting en place
- Achats in-app : **Oui** (coins)
- Partage de la localisation précise : **Oui, avec opt-in**
- Interactions entre utilisateurs : **Oui** (messages, appels)

Résultat attendu : **PEGI 12 / ESRB Teen / IARC 12+**.

---

## 8. App content → Autres formulaires Play Console

### Ads
- Does your app contain ads? → **No**

### Target audience and content
- Which age groups will use your app? → **13+** (ne coche pas "Children")

### News app
- Does your app qualify as a news app? → **No** (AfriWonder a une section News mais n'est pas une app de presse)

### COVID-19 contact tracing and status apps
- Is your app a COVID-19 contact tracing or status app? → **No**

### Data safety
- Voir section 6 ci-dessus.

### Government apps
- Is your app a government app? → **No**

### Financial Features
- Does your app offer financial features? → **Yes**
  - Cryptocurrency features? → **No**
  - Lending features? → **Yes** (microcrédit)
  - Payments features? → **Yes** (Orange Money, Wave, Stripe, IAP)
  - Banking features? → **No**
  - Investment features? → **No**
  - Financial guidance, tools and/or research? → **No**

### Health
- Does your app offer health features? → **Yes** (téléconsultation, pharmacies)
  - Medical device? → **No**
  - Clinical trial? → **No**

---

## 9. Tarification et distribution

| Champ | Valeur |
|---|---|
| Application gratuite ou payante ? | **Gratuite** |
| Contient des achats in-app ? | **Oui** (AfriCoin) |
| Pays de distribution | Au minimum : **Mali**, **Sénégal**, **Côte d'Ivoire**, **Burkina Faso**, **Guinée**. Extensible selon roadmap. |
| Disponible en tablette ? | **Téléphone uniquement** (app.json : `"supportsTablet": false` sur iOS — Android l'accepte par défaut, à vérifier) |

---

## 10. Test interne avant production

Avant de passer en `Production`, Google recommande **Internal testing** :

1. Play Console → Testing → Internal testing → Create new release
2. Upload de l'AAB
3. Ajouter ton email en liste de testeurs internes
4. Installer depuis l'app Play Store (le lien interne est visible dans la Console)
5. Tester 48 h — vérifier Sentry, logs, crash-free > 99,5 %
6. Promouvoir vers Production

---

## 11. Texte du changelog (What's new in this version)

Pour la version 1.0.0, exemple :

```
🎉 Lancement officiel d'AfriWonder au Mali !
• Réseau social : feed vidéo, stories, messagerie chiffrée
• Paiement mobile : Orange Money, Wave, carte bancaire
• Marketplace et services locaux (transport, santé, immobilier)
• Appels audio/vidéo, live streaming, cadeaux virtuels
• Wallet avec transfert instantané et cashback AfriCoin

Merci de faire partie de cette aventure. Retours : support@afriwonder.com
```
*(380 caractères — ok, max 500)*
