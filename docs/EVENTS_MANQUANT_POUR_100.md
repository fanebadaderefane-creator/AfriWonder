# Ce qui manque pour atteindre 100 % — Module Événements

Liste exhaustive des fonctionnalités **non implémentées ou partielles** par rapport au prompt officiel, avec priorité et effort estimé.

---

## Priorité haute (impact direct utilisateur / organisateur)

| # | Fonctionnalité | Où | Effort | Détail |
|---|----------------|-----|--------|--------|
| 1 | **Téléchargement billet PDF** | Prompt §2 (Billetterie) | Moyen | Générer un PDF avec QR code, nom événement, date, nom participant ; bouton "Télécharger mon billet" sur MyEventTickets et après confirmation paiement. Backend : route `GET /api/events/tickets/:id/pdf` ou service PDF (ex. PDFKit). |
| 2 | **Export CSV participants** | Prompt §5 (Dashboard) | Faible | Dans EventOrganizerDashboard : bouton "Exporter CSV" qui appelle `GET /api/events/:id/participants/export` (retourne fichier CSV : email, nom, checked_in, etc.). |
| 3 | **Rappels 24h et 1h avant** | Prompt §9 (Notifications) | Moyen | Job planifié (cron ou queue) : la veille et 1h avant `start_date`, envoyer notification (in-app + optionnel email/SMS) aux détenteurs de billets. Utiliser `notificationService.create` + optionnel `sendSmsToUser`. |
| 4 | **Affichage FAQ événement** | Prompt §12 (UX) | Faible | Le champ `Event.faq` (JSON) existe ; afficher une section "FAQ" sur EventDetails quand `event.faq` est renseigné (liste question/réponse). |

---

## Priorité moyenne (confort et différenciation)

| # | Fonctionnalité | Où | Effort | Détail |
|---|----------------|-----|--------|--------|
| 5 | **Carte interactive (Leaflet)** | Prompt §12 (UX) | Moyen | Sur EventDetails, si `latitude` et `longitude` sont renseignés, afficher une carte (react-leaflet) avec marqueur du lieu. |
| 6 | **Countdown avant début** | Prompt §12 (UX) | Faible | Sur EventDetails, afficher un compte à rebours (jours, heures, minutes) jusqu’à `event.start_date` pour les événements à venir. |
| 7 | **Envoyer message à tous les inscrits** | Prompt §5 (Dashboard) | Moyen | Dans le dashboard : champ "Message à tous" + envoi ; backend `POST /api/events/:id/notify-participants` qui crée une notification pour chaque utilisateur ayant un billet payé. |
| 8 | **Clôturer événement (bouton)** | Prompt §5 (Dashboard) | Faible | Bouton "Clôturer l’événement" dans EventOrganizerDashboard qui appelle `PATCH /api/events/:id` avec `status: 'completed'`. Déjà possible via API, il manque juste le bouton en UI. |
| 9 | **Paiements MTN / Wave / Flutterwave / Paystack (événements)** | Prompt §4 (Paiement Afrique) | Élevé | Réutiliser ou adapter les stubs de `payment.service.ts` (initiateMtnMoneyPayment, etc.) dans le flux `event.service.bookTicket` selon `payment_method`, et prévoir confirmation/webhook par provider. |
| 10 | **Mise en avant payante (is_featured)** | Prompt §7 (Monétisation) | Faible | Déjà en BDD (`is_featured`) ; ajouter dans CreateEvent/EditEvent une option "Mise en avant (payante)" avec prix fixe et enregistrement de la commission ou du paiement. |

---

## Priorité basse (nice-to-have / stratégique)

| # | Fonctionnalité | Où | Effort | Détail |
|---|----------------|-----|--------|--------|
| 11 | **Section intervenants** | Prompt §12 (UX) | Moyen | Champ optionnel en BDD (ex. `Event.speakers` JSON ou table EventSpeaker) + bloc "Intervenants" sur la page événement avec noms, rôles, photos. |
| 12 | **Analytics : villes des participants, pic inscriptions, source trafic** | Prompt §11 (Analytics) | Moyen | Stocker ville (depuis adresse user) ou referrer ; dashboard organisateur : graphiques ou tableaux (villes, inscriptions par jour, source). |
| 13 | **Paiement sur place / USSD** | Prompt §15 (Afrique) | Élevé | Option "Payer sur place" ou "Code USSD" : générer un code unique par réservation, affichage dans "Mes billets", et marquer comme payé après encaissement manuel ou validation USSD. |
| 14 | **Réservation sans carte / Paiement fractionné** | Prompt §15 (Afrique) | Élevé | Réservation sans carte : créer un billet "en attente de paiement" avec délai ; paiement fractionné : plusieurs échéances (nécessite modèle et logique de paiements partiels). |
| 15 | **Live teaser / Billet acheté pendant live / Badge profil** | Prompt §16 (Intégration vidéo) | Élevé | Lier un événement à un live (ex. `event_id` sur LiveStream) ; badge "Acheté pendant live" sur le billet ou le profil si achat effectué pendant un stream ; affichage conditionnel sur EventDetails. |
| 16 | **Chat en direct pendant l’événement** | Prompt §6 & §8 | Élevé | Salon de chat lié à l’événement (channel par event_id), accessible aux inscrits pendant la durée de l’événement (WebSocket ou polling). |
| 17 | **Sponsoring événement / Publicité page événement** | Prompt §7 (Monétisation) | Moyen | Modèle Sponsor ou champs sur Event (bannières, logos) ; zone "Partenaires" ou encarts sur EventDetails. |
| 18 | **Vente produits pendant l’événement** | Prompt §7 | Élevé | Lien vers produits ou panier "événement" (ex. goodies) ; nécessite intégration marketplace / commande. |
| 19 | **Voir amis inscrits** | Prompt §8 (Social) | Moyen | Pour un événement, afficher les amis (follow/following) qui ont un billet ; requête côté backend (liste user_id des billets ∩ liste amis). |
| 20 | **Notifications : Push, Email, SMS** | Prompt §9 | Moyen | Déjà partiel (in-app) ; ajouter envoi email (template confirmation, rappel) et SMS (via notificationService.sendSmsToUser) pour confirmation inscription et rappels 24h/1h. |
| 21 | **Anti-bot** | Prompt §10 (Sécurité) | Moyen | Limiter les réservations par IP ou par user (rate limit), optionnel CAPTCHA sur formulaire de réservation. |
| 22 | **Logs actions sensibles** | Prompt §10 | Faible | Logger explicitement (logger.info/warn) : création/modification événement, check-in, annulation billet, confirmation paiement. |

---

## Récapitulatif par effort

- **Faible** (quelques heures) : 2, 4, 6, 8, 10, 22  
- **Moyen** (demi-journée à 1 jour) : 1, 3, 5, 7, 11, 12, 17, 19, 20, 21  
- **Élevé** (plusieurs jours) : 9, 13, 14, 15, 16, 18  

---

## Pour viser 100 % rapidement

En priorisant le **faible effort** et la **haute priorité** :

1. **Export CSV** (dashboard).  
2. **FAQ** sur EventDetails.  
3. **Countdown** avant début.  
4. **Bouton Clôturer** dans le dashboard.  
5. **Téléchargement PDF billet** (service + route + bouton).  
6. **Rappels 24h/1h** (job + notifications).  

Ensuite : carte Leaflet, message à tous les inscrits, mise en avant payante, puis le reste selon la roadmap produit.
