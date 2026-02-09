# Vérification écrans et connexion Frontend ↔ Backend

## Corrections appliquées

1. **api.certificates.list()**  
   La deuxième définition de `api` dans `expressClient.js` écrasait `certificates` et ne gardait que `verify()`.  
   → **Corrigé** : `certificates.list()` a été ajouté au bloc final (GET `/api/certificates`).

2. **api.courses.getEnrollment()**  
   La page CourseDetails utilise `api.courses.getEnrollment(courseId)` alors que le bloc final n’exposait que `getMyEnrollment()`.  
   → **Corrigé** : ajout de `getEnrollment(courseId)` comme alias de `getMyEnrollment(courseId)`.

3. **api.courses.getInstructorDashboard()**  
   Présent seulement dans le premier bloc, absent du bloc final qui écrase `courses`.  
   → **Corrigé** : ajout de `getInstructorDashboard()` dans le bloc `courses` exporté.

---

## Base URL et auth

- **Frontend** : `axiosInstance` avec `baseURL = VITE_API_URL || 'http://localhost:3000/api'`.
- **Backend** : routes montées sous `/api/*` (ex. `/api/courses`, `/api/messages`).
- **Auth** : token envoyé via `Authorization: Bearer <access_token>` (localStorage).

---

## Écrans principaux et endpoints utilisés

| Écran | Appels API principaux | Backend (route existante) |
|-------|------------------------|---------------------------|
| **Home** | auth.me, videos.list, videos.getComments, videos.like, videos.comment, payments.addToWallet, videos.share | ✅ auth, videos, payments |
| **Courses** | auth.me, courses.list (page, limit, search, category, level, sort, price) | ✅ GET /courses |
| **CourseDetails** | auth.me, courses.getById, courses.getEnrollment, courses.enroll, courses.completeLesson, courses.addReview | ✅ GET /courses/:id, GET enrollment, POST enroll, POST complete, POST reviews |
| **Certificates** | auth.me, certificates.list | ✅ GET /certificates (listByUser) |
| **VerifyCertificate** | certificates.verify(token) | ✅ GET /certificates/verify/:token |
| **Inbox** | auth.me, messages.getConversations | ✅ GET /messages/conversations |
| **Chat** | auth.me, messages.getConversation(userId), messages.getMessages, messages.getPresence, messages.markAsRead, messages.send | ✅ GET conversation/:userId, GET /:conversationId, GET presence/:userId, PUT read, POST send |
| **Leaderboard** | auth.me, leaderboard.get({ range }) | ✅ GET /leaderboard?range= |
| **Events** | events.list | ✅ GET /events |
| **EventDetails** | events.getById, events.book, events.confirmPayment, events.like, events.addComment, events.getComments, events.getFriendsAttending, events.getChat, events.addChatMessage | ✅ events routes |
| **EventOrganizerDashboard** | events.getDashboard, events.getAnalytics, events.payForFeature, events.checkIn, events.exportParticipantsCsv, events.notifyParticipants, events.closeEvent | ✅ GET :id/dashboard, etc. |
| **MyEventTickets** | events.getMyTickets, events.downloadTicketPdf | ✅ GET my-tickets, GET tickets/:id/pdf |
| **Lives** | auth.me, live list (probable) | ✅ GET /live |
| **LiveView** | auth.me, live.getById, live.getStreamToken, live.joinViewer, live.leaveViewer, live.heartbeat, live.getWallet, orders.list, live.sendChatMessage, live.sendGift, live.ban, live.like | ✅ GET /live/:id, GET :id/token, POST join/leave/heartbeat, etc. |
| **LiveStream / StartLive** | live.getById, live.getStreamToken, live.start, live.end, live.sendChatMessage | ✅ POST /live/start, POST :id/end |
| **RechargeWallet** | live.getWallet, auth.me, live.confirmWalletRecharge, live.rechargeWallet | ✅ GET/POST wallet/recharge |
| **Orders** | auth.me, orders.list | ✅ GET /orders |
| **OrderTracking** | orders.getById, orders.updateStatus, orders.downloadInvoice | ✅ GET /orders/:id, POST update, GET invoice |
| **Checkout** | auth.me, orders.create | ✅ POST /orders |
| **Marketplace / Product** | products.list, products.getById, orders.create | ✅ GET/POST products, GET/POST orders |
| **Cart** | auth.me | (cart côté client ou API selon implémentation) |
| **Wallet** | payments.getWallet, payments.getTransactions, payments.withdrawFromWallet | ✅ GET/POST wallet, GET transactions |
| **Profile** | auth.me, videos (list/delete/getById), products.list, orders.getStats | ✅ users, videos, products, orders |
| **VideoView** | auth.me, videos.getById, videos.getComments, videos.like, videos.comment | ✅ GET /videos/:id, comments |
| **Create / EditVideo** | auth.me, videos.getById, videos.update, videos.delete, videos.create | ✅ POST/GET/PUT/DELETE videos |
| **Settings** | auth.me, auth.updateMe, auth.logout | ✅ GET /auth/me, PUT /users/me |
| **AdminDashboard** | auth.me, videos.list, payments.getTransactions | ✅ admin, videos, payments |
| **Discover** | auth.me, videos.list, products.list | ✅ videos, products |
| **Search** | videos.list, products.list | ✅ GET /videos, GET /products |
| **News** | auth.me, (news API si utilisé) | ✅ GET /news |
| **SellerDashboard / SellerOrders / SellerWallet** | auth.me, orders.list, payments.getTransactions, products.list | ✅ orders, payments, products |
| **Providers / ServiceBooking / Bookings** | auth.me, providers, bookings | ✅ GET/POST /providers, /bookings |

Tous les modules listés ci‑dessus ont leurs routes montées dans `backend/src/app.ts` sous `/api/...`.

---

## Vérifications recommandées en exécution

1. **Variables d’environnement**  
   - Frontend : `VITE_API_URL` doit pointer vers le backend (ex. `http://localhost:3000/api` si le backend sert sous `/api`).  
   - Backend : `CORS_ORIGIN` doit autoriser l’origine du frontend.

2. **Démarrer backend et frontend**  
   - Backend : `cd backend && npm run dev` (ou `node dist/index.js` après build).  
   - Frontend : `npm run dev`.

3. **Tests manuels rapides**  
   - Connexion (Landing → Login) puis accès à Home, Profile, Settings.  
   - Cours : liste (Courses), détail (CourseDetails), inscription, progression.  
   - Messages : Inbox, ouverture d’un Chat, envoi, marquage lu.  
   - Certificats : Mes certificats (Certificates), Vérification (VerifyCertificate?token=xxx).  
   - Leaderboard : changement de période (range).  
   - Événements : liste, détail, réservation.  
   - Live : liste, vue viewer, (streamer si configuré).

Si un écran renvoie 401 : vérifier que l’utilisateur est connecté et que le token est bien envoyé.  
Si un écran renvoie 404 : vérifier l’URL dans `expressClient.js` (méthode utilisée et chemin).
