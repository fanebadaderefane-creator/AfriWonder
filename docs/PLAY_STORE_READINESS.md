# Play Store Readiness — AfriWonder v1.0.0

**Date :** 24 avril 2026  
**Cible :** Google Play Store (marché Mali + Afrique)  
**Package :** `com.afriwonder.app`  
**Version :** `1.0.0` (versionCode `1`)

> ⚠️ **Note 2026** : Les règles Play Store évoluent tous les ans en août. Vérifie dans **Play Console → Policy Center** la cible `targetSdkVersion` en vigueur au moment de ta soumission (API 35 en 2025 ; **possiblement API 36** en août 2026). Le Data Safety form a aussi des nouvelles questions sur l'IA générative et le Privacy Sandbox depuis 2025/2026.

---

## 🟢 GO / 🔴 NO-GO — Verdict global

### Côté **code** : 🟢 GO
Tous les blocages techniques connus sont corrigés. L'app compile, type et linte proprement. Les règles Play Store critiques sont respectées.

### Côté **compte éditeur** : 🔴 NO-GO **bloquant indépendant du code**
Tu ne peux **pas publier** tant que :
1. Ton compte développeur Google Play est **en cours de validation d'identité** (tu l'as vu dans ta Console).
2. Tu n'as pas validé le **numéro de téléphone** dans la Console.
3. Tu n'as pas renseigné les **URLs publiques** obligatoires (cf. section 4).

Dès que les 3 sont faits, tu peux builder + soumettre.

---

## 1. ✅ Ce qui est OK côté code

| Item | Statut |
|---|---|
| Backend `tsc --noEmit` | ✅ 0 erreur |
| Mobile `tsc --noEmit` | ✅ 0 erreur |
| Mobile `eslint` | ✅ 0 erreur (21 warnings P2 cosmétiques) |
| Violations React Hooks | ✅ 0 |
| Suppression de compte in-app | ✅ **Ajoutée** (`/settings/delete-account`) — branchée sur `POST /api/privacy/delete-account` |
| Lien vers Privacy Policy accessible dans l'app | ✅ (`/privacy-policy.tsx`) |
| IAP pour biens numériques (coins) | ✅ `react-native-iap` (Play Billing conforme) |
| Permissions Android demandées justifiées | ✅ Nettoyées (`USE_BIOMETRIC`, `USE_FINGERPRINT`, `READ_EXTERNAL_STORAGE` retirées) |
| `AD_ID` bloqué explicitement | ✅ (`blockedPermissions`) |
| `usesCleartextTraffic: false` | ✅ |
| `targetSdkVersion` | ⚠️ Expo SDK 54 → API 35 ; **en août 2026 Google exigera probablement API 36** pour nouvelles apps. À vérifier Console + possible upgrade Expo SDK 55+ avant soumission |
| Support 64-bit | ✅ Par défaut Expo |
| Version code / version name | ✅ `versionCode: 1`, `version: "1.0.0"` |
| `autoIncrement` en production | ✅ (eas.json) |
| Chiffrement E2EE messages | ✅ Mais doit être **déclaré** dans Data Safety form |
| Monitoring Sentry | ✅ `@sentry/react-native` installé — **à déclarer** dans Data Safety |

## 2. 🔴 Ce qui doit être fait AVANT de soumettre (humain)

### 2.1 Compte développeur Google Play
- [ ] Valider identité (en cours chez Google, ~2-7 jours ouvrés)
- [ ] Valider numéro de téléphone
- [ ] Accepter le nouveau Developer Program Agreement si demandé

### 2.2 URLs publiques obligatoires
Play Console exige au moment de la création de la fiche app :
- [ ] **Privacy Policy URL** (obligatoire) — ex. `https://afriwonder.com/privacy` ou `https://afriwonder.com/privacy-policy`
- [ ] **Support email** (obligatoire) — ex. `support@afriwonder.com`
- [ ] Website URL (recommandé) — ex. `https://afriwonder.com`
- [ ] Account deletion URL (obligatoire pour apps avec compte utilisateur) — ex. `https://afriwonder.com/account/delete`

**⚠️ Attention :** la page `/privacy-policy` dans l'app ne suffit pas. Play Store veut une **URL publique HTTPS** accessible sans l'app. Il faut servir cette page depuis la PWA racine (Vite) ou le backend.

### 2.3 Fiche Play Store
- [ ] Nom : `AfriWonder` (vérifie qu'il n'est pas déjà pris)
- [ ] Description courte (80 caractères max)
- [ ] Description longue (4000 caractères max)
- [ ] Icône 512×512 (tu l'as déjà dans `assets/images/icon.png` — vérifier la taille)
- [ ] Feature graphic 1024×500
- [ ] Au moins **2 captures d'écran** (téléphone), idéalement 4–8. Recommandé : 9:16 en 1080×1920
- [ ] Vidéo YouTube (optionnel mais très recommandé pour une super-app)
- [ ] Catégorie : **Social** (probablement la meilleure)
- [ ] Tags / contenu : `Social`, `Lifestyle`, `Communication`
- [ ] Classification de contenu — remplir le questionnaire IARC (environ 15 questions)

### 2.4 Data Safety form (onglet dédié dans Play Console — version 2026)
Tu dois déclarer **exactement** ce que tu collectes. En 2026, Google a ajouté des sections spécifiques pour l'IA générative et le Privacy Sandbox. Liste pour AfriWonder :

**Personnel identifiable :**
- Nom, email, numéro de téléphone, photo de profil (pour inscription + profil)

**Localisation :**
- Approximative et précise (pour services locaux, recommandations) — opt-in utilisateur

**Messages :**
- Messages dans l'app (E2EE) — stockés chiffrés, non lisibles par AfriWonder

**Photos et vidéos :**
- Upload optionnel pour profil, posts, stories, messages

**Audio :**
- Messages vocaux (opt-in)

**Infos financières :**
- Historique de transactions Orange Money / Wave / Stripe (stocké pour obligation légale)

**Infos de santé, fitness :** Non collecté.

**Contacts :**
- Opt-in pour trouver des amis (synchronisation locale hashée)

**Activité app :**
- Historique de vue, interactions, clicks (pour recommandations)

**Identifiants de l'appareil :**
- Push token FCM (pour notifications)

**Diagnostics et crash :**
- Sentry — rapport de crash anonyme

**Données chiffrées en transit :** Oui (HTTPS + E2EE messages)  
**Partage avec tiers :** Orange Money, Wave, Stripe (pour paiements), Sentry (diagnostics)  
**Suppression des données :** Oui, via `/settings/delete-account` dans l'app (et via URL web à créer)

**IA générative (nouveau 2026) :**
AfriWonder expose des fonctionnalités d'assistant IA (`aiEngine.service.ts`, `assistant.service.ts`, `chatbot.routes.ts`). Déclare dans la section IA du Data Safety :
- **Type** : assistant conversationnel / recommandations
- **Données envoyées au modèle IA** : texte utilisateur, historique récent de conversation — **pas** de données financières, **pas** d'images de documents d'identité
- **Provider** : à renseigner selon ton backend (OpenAI, Mistral, Anthropic, self-hosted…)
- **Filtres de contenu** : modération `moderation.service.ts` + `bannedWord.service.ts` en place

**Privacy Sandbox (nouveau 2026) :**
Tu bloques `AD_ID`. Déclare "Ne collecte pas d'ID publicitaire". Le Privacy Sandbox n'est pas pertinent tant que tu n'activeras pas les ads.

### 2.5 Signing key
- [ ] Laisser EAS gérer la clé de signature (recommandé) — `eas build --platform android --profile production`
- [ ] **OU** uploader ta propre keystore. Ne la perds pas, elle est irremplaçable.

### 2.6 Test de l'APK / AAB
- [ ] Lancer un build `preview` : `eas build --platform android --profile preview`
- [ ] Installer l'APK sur un Android **réel** (pas émulateur)
- [ ] Tester : inscription, connexion, feed, paiement, suppression de compte → tous doivent fonctionner
- [ ] Vérifier les crash Sentry pendant 48 h

---

## 3. 🟡 Motifs de refus fréquents — statut AfriWonder

| Motif de refus Play Store | Statut AfriWonder |
|---|---|
| Crash au démarrage | ⚠️ À valider sur device (code OK, dépend du backend accessible) |
| Permissions sans usage | ✅ Nettoyées |
| Privacy policy manquante | 🔴 **URL publique à créer** |
| Account deletion manquante | ✅ Écran ajouté + endpoint backend |
| IAP non utilisée pour biens numériques (coins) | ✅ Play Billing utilisé |
| Paiement externe pour contenu de l'app | ⚠️ Orange Money/Wave OK car **biens/services réels** (pas contenu numérique in-app). Play autorise cela. |
| targetSdkVersion trop bas | ✅ API 35 (Expo SDK 54) |
| 32-bit only | ✅ 64-bit par défaut |
| Liens vers sites externes non HTTPS | ✅ `usesCleartextTraffic: false` |
| Copie / impersonation d'une app existante | 🟡 À vérifier que "AfriWonder" n'est pas en conflit |
| Contenu sexuel / violent / haineux | ✅ Modération en place (banned words, reports, sanctions) |
| Apps pour enfants (<13 ans) sans COPPA | ⚠️ Si cible inclut <13, il faut **Designed for Families**. Sinon, restreindre l'âge minimum dans Play Console. |
| Fonctionnalité cassée / placeholder | ✅ Tous les "Bientôt disponible" retirés |
| Messages techniques visibles (`Error`, `undefined`) | ✅ Nettoyés (cf. `ERROR_MESSAGE_GUIDELINES.md`) |
| Deep links cassés | ⚠️ À tester sur device |
| Données sensibles en clair dans les logs | ✅ Pas de `console.log` d'objets utilisateur bruts (vérifié au scan) |

---

## 4. 📋 Checklist finale avant `eas submit`

### Code & Build
- [x] `tsc --noEmit` backend = 0 erreur
- [x] `tsc --noEmit` mobile = 0 erreur
- [x] `eslint` mobile = 0 erreur
- [x] CI gate bloquant (`.github/workflows/ci.yml` job `typecheck-and-lint`)
- [x] Suppression de compte en 1 clic
- [x] IAP pour coins
- [x] Permissions Android nettoyées
- [x] Feature flags activés par défaut
- [x] Écrans "Bientôt disponible" remplacés par la vraie logique
- [ ] Build `preview` APK testé sur un Android réel
- [ ] Build `production` AAB généré

### Contenu Play Console
- [ ] Privacy policy URL publique (hors app)
- [ ] Account deletion URL publique (hors app)
- [ ] Support email
- [ ] Icône 512×512
- [ ] Feature graphic 1024×500
- [ ] 4 à 8 captures d'écran
- [ ] Description courte
- [ ] Description longue
- [ ] Catégorie
- [ ] Classification IARC
- [ ] Data Safety form rempli
- [ ] App content form rempli (Ads, target audience)
- [ ] Bloqué en-dessous de 13 ans (si cible >13)

### Backend prod
- [ ] `backend` déployé (ex. Render)
- [ ] Base PostgreSQL prod avec migrations à jour
- [ ] Secrets EAS configurés : `EXPO_PUBLIC_BACKEND_URL`, clés Orange Money/Wave/Stripe, Sentry DSN
- [ ] Seed data Mali (1+ restaurant, médecin, trajet par ville pour éviter "Aucun résultat")
- [ ] Health check endpoint `/health` répond 200

### QA device
- [ ] Test inscription sur device réel
- [ ] Test connexion OAuth (Google/Apple)
- [ ] Test feed + scroll + vidéo
- [ ] Test paiement Orange Money sandbox
- [ ] Test paiement Wave sandbox
- [ ] Test IAP coins (sandbox Play)
- [ ] Test suppression de compte (complet)
- [ ] Test en 3G (throttling Chrome DevTools)
- [ ] Test offline → retour online
- [ ] Test notifications push

---

## 5. Commandes pour le lancement (pour plus tard)

**Une fois le compte Google validé** :

```bash
# 1. Configurer les secrets EAS (URL backend, clés tierces)
cd frontend
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value "https://afriwonder-api.onrender.com"
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "..."
# + clés Orange Money / Wave / Stripe si côté frontend

# 2. Build AAB de production
eas build --platform android --profile production

# 3. Télécharger l'AAB depuis expo.dev → le glisser dans Play Console → Production → Créer une version

# Alternative automatique (nécessite google-service-account.json dans frontend/)
eas submit --platform android --profile production --latest
```

---

## 6. Résumé pour décision

**Est-ce que je peux soumettre aujourd'hui ?**

- **Techniquement** : ✅ Oui, le code est prêt (0 bug bloquant connu).
- **Administrativement** : ❌ Non, parce que :
  1. Google Play n'a pas encore validé ton compte développeur
  2. Tu n'as pas d'URL publique Privacy Policy + Account Deletion
  3. Tu n'as pas encore les captures, feature graphic, descriptions

**Ordre recommandé :**

1. Attendre la validation du compte Google (tu ne contrôles pas la durée).
2. Pendant ce temps :
   - Créer la page publique `afriwonder.com/privacy` et `afriwonder.com/account/delete` (servies par la PWA racine ou le backend)
   - Préparer captures, feature graphic, descriptions
   - Tester l'APK preview sur device Mali réel
3. Dès que la Console débloque "Créer une application" :
   - Remplir la fiche complète
   - Uploader l'AAB
   - Soumettre en **test interne** d'abord (pas production)
   - Après 48h de test interne OK, promouvoir en **production**

**Risque de refus** si tu soumettais maintenant : **faible côté code**, **élevé côté fiche** (Privacy URL, captures, Data Safety form non remplis).

---

Dernière mise à jour : 24 avril 2026, après corrections P0 + ajout suppression de compte + nettoyage permissions + prise en compte des exigences Play Store 2026 (API 36 en vue, déclaration IA générative, Privacy Sandbox).
