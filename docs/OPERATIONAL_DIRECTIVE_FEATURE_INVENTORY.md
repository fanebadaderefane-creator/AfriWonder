# Inventaire des surfaces — tests directive lancement

Liste de travail pour la **section 11** de [`OPERATIONAL_DIRECTIVE_LAUNCH.md`](./OPERATIONAL_DIRECTIVE_LAUNCH.md) : chaque écran / module listé doit être couvert par un test manuel (ou campagne équivalente documentée) avant sign-off.

**Mobile Expo :** fichiers sous `frontend/app/**/*.tsx` (routes fichier).  
**Régénérer la liste brute** (chemins relatifs au repo) :

```powershell
Set-Location frontend
Get-ChildItem -Path "app" -Recurse -Filter "*.tsx" | ForEach-Object {
  $_.FullName.Replace((Get-Location).Path + [char]92, "").Replace([char]92, "/")
} | Sort-Object | Set-Content "../docs/_scratch_expo_paths.txt"
```

*(Retirer `_scratch_expo_paths.txt` du commit si usage ponctuel ; ou versionner après nettoyage des chemins relatifs.)*

**Dernier décompte indicatif :** ~208 fichiers `.tsx` sous `frontend/app` (inclut layouts et écrans).

---

## Groupe A — Authentification & onboarding

| Route (fichier) | Notes QA |
|-----------------|----------|
| `(auth)/login.tsx` | Connexion, validation |
| `(auth)/register.tsx` | Inscription, validation |
| `onboarding.tsx` | Parcours premier lancement si actif |

*Mot de passe oublié : flux dans `(auth)/login.tsx` — lien « Mot de passe oublié ? », modal, appel `authApi.forgotPassword` / reset token (tester email, cas compte inconnu, erreur réseau).*

---

## Groupe B — Onglets principaux & navigation

| Route | Notes |
|-------|--------|
| `(tabs)/_layout.tsx` | Structure onglets |
| `(tabs)/index.tsx` | Feed / home |
| `(tabs)/discover.tsx` | Découverte |
| `(tabs)/create.tsx` | Création contenu |
| `(tabs)/messages.tsx` | Entrée messagerie |
| `(tabs)/profile.tsx` | Profil self |
| `(tabs)/market.tsx` | Marketplace |
| `(tabs)/explore.tsx`, `(tabs)/friends.tsx`, `(tabs)/admin.tsx` | Si exposés aux utilisateurs cible |

---

## Groupe C — Profil & social

`user/[id].tsx`, `profile-edit.tsx`, `profile-qr.tsx`, `profile-connections.tsx`, `find-friends.tsx`, `sync-contacts.tsx`, `suggest-creators.tsx`, `stories.tsx`, `feed.tsx`, `sound-feed.tsx`, `watch/[id].tsx`, `badges-profile.tsx`, `interests.tsx`, `referrals.tsx`, `connect-now.tsx`, etc.

---

## Groupe D — Recherche

`search.tsx`

---

## Groupe E — Notifications

`notifications/index.tsx` (+ `_layout`)

---

## Groupe F — Messagerie & appels

`messages/index.tsx`, `messages/[id].tsx`, `messages/call.tsx`, `messages/new-group.tsx`, `messages/requests.tsx`, `messages/components/MessageRequestDetailPane.tsx`

---

## Groupe G — Paramètres (tout le dossier)

`settings/index.tsx` et sous-dossiers : `security/`, `privacy/`, `delete-account.tsx`, `notifications.tsx`, `language.tsx`, `display.tsx`, `data-saver.tsx`, `blocked-accounts.tsx`, etc.

---

## Groupe H — Wallet, paiements, marketplace

**Wallet :** `wallet/index.tsx`, `transfer.tsx`, `recharge.tsx`, `qr-pay.tsx`, `cards.tsx`, `coins.tsx`, `microcredit.tsx`  
**Panier / commande :** `cart/`, `checkout/` (index, orange-money, wave, mobile-money)  
**Produits :** `product/[id].tsx`, `orders/`, `wishlist.tsx`  
**Paiements :** `payments/index.tsx`  
**Africoin :** `africoin/*`

---

## Groupe I — Live & replay

`live/index.tsx`, `live/[id].tsx`, `live/stream.tsx`, `live/replay.tsx`, `live/gifts.tsx`, `live/start.tsx`, `live/analytics/[id].tsx`

---

## Groupe J — Stars (appels payants / bookings)

`stars/index.tsx`, `stars/[id].tsx`, `stars/become.tsx`, `stars/bookings.tsx`, `stars/dashboard.tsx`, `stars/call/[bookingId].tsx`, `stars/rate/[bookingId].tsx`

---

## Groupe K — Crowdfunding

`crowdfunding/index.tsx`, `create.tsx`, `[id].tsx`, `contribute.tsx`, `dashboard.tsx`, `history.tsx`

---

## Groupe L — Tontines, épargne, rides

`tontines/index.tsx`, `tontines/create.tsx`, `tontines/[id].tsx`  
`savings/index.tsx`  
`rides/[id].tsx`

---

## Groupe M — Super-app & services (hub)

`menu-plus.tsx`, `bills.tsx`, `bills/pay.tsx`, `airtime.tsx`  
`health/doctors.tsx`, `health/book.tsx`  
`services/index.tsx` et écrans : `transport`, `food`, `health`, `jobs`, `voyage`, `vehicle-rental`, `covoiturage`, `events`, `realestate`, `insurance`, `childcare`, etc.

---

## Groupe N — Admin (rôle restreint)

`(admin)/*` — tests si le rôle est dans le périmètre lancement.

---

## Groupe O — Divers produit

`crowdfunding` déjà cité · `courses/` · `news/` · `communities/` · `playlists/`, `playlist/[id].tsx` · `miniapps.tsx` · `leaderboard.tsx` · `challenges.tsx` · `subscriptions.tsx` · `creator/*` · `seller/*` · `admin-dashboard.tsx` · pages légales (`privacy-policy`, `terms`, `data-protection`) · `support-page`, `faq`, `about`, etc.

---

## Feature flags

Les écrans peuvent exister mais être **désactivés** (`featureFlags`, `ComingSoonScreen`). Pour le lancement :

- soit le test valide le **masquage propre** ;
- soit le test valide le **parcours complet** si le flag est activé en prod.

Réf. : `frontend/src/config/featureFlags.ts` (et équivalents).

---

*Ce document est une **carte de tests** : le produit peut prioriser un sous-ensemble « must ship » pour la v1 Mali, mais la directive exige que tout ce qui est **activé pour les utilisateurs** soit testé.*
