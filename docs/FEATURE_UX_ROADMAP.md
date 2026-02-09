# AfriWonder — Fonctionnalités, UX et tests

Checklist et priorités pour les prochaines évolutions.

---

## 1. Fonctionnalités

| Élément | Statut | Note |
|--------|--------|------|
| Replay des lives | ✅ | `replay_url` à la fin du live ; affichage iframe dans LiveView ; section Replays sur page Lives |
| Notification « Live started » | ✅ | Backend envoie aux followers à la création du stream |
| Cadeaux live (90 % créateur / 10 % AfriConnect) | ✅ | Backend + mention dans le panneau cadeaux (LiveView) |
| Rappels événements (24h / 1h) | ✅ | Cron `POST /api/events/cron/send-reminders` |
| Token Agora (créateur + audience) | ✅ | SDK intégré dans LiveStream.jsx et LiveView.jsx |
| Recharge wallet (Orange Money + confirmation) | ✅ | Page RechargeWallet + callback `?transactionId=` |
| À faire / optionnel | | Webhook Orange Money pour confirmation auto ; notifications push (FCM) ; SMS commandes |

---

## 2. UX / UI

| Axe | Action |
|-----|--------|
| Messages d’erreur | ✅ `expressClient` attache `error.apiMessage` ; utiliser `err.apiMessage \|\| err.message` dans les toasts (ex. LiveStream, LiveView, Checkout) |
| Formulaires | Validation côté client (ex. champs requis, format email) ; messages sous les champs en cas d’erreur |
| Responsive | Vérifier les pages clés (Live, Events, Checkout, Profil) sur mobile et tablette |
| Parcours | Vérifier : inscription → premier live, premier événement, premier cadeau, première commande |
| Cadeau 10 % | Texte clair : « Le créateur reçoit 90 %. AfriConnect prélève 10 %. » (LiveView + optionnellement Wallet / RechargeWallet) |

---

## 3. Bugs / incohérences à surveiller

- LiveView : quitter la page pendant « Connexion au flux... » → bien appeler `leaveAgora` au démontage (déjà géré par le hook).
- Lives.jsx : s’assurer que la liste renvoie bien `status` et `replay_url` pour les streams terminés (API entities).
- Paiement : en cas d’échec, message explicite (solde insuffisant, paiement refusé, etc.) depuis l’API.

---

## 4. Tests / robustesse

Voir **`docs/TESTS_CRITIQUES.md`** pour les scénarios à couvrir (auth, paiement, live, events) et les tests unitaires / E2E à ajouter.

---

## 5. Commission plateforme (rappel)

- **Lives (cadeaux)** : créateur 90 %, AfriConnect 10 %.
- **Événements** : commission configurée (ex. 12 % sur billetterie).
- **Services / cours / tips** : 10–15 % selon module (voir backend).

Les montants affichés côté créateur (wallet, analytics) sont déjà nets après commission.
