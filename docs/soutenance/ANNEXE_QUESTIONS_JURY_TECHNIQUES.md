# Annexe — Questions jury techniques AfriWonder (dense)

**À utiliser comme fiches révision ; ne pas tout projeter.**

Chaque bloc : **Q** • **Réponse courte (mémo)** • **Fichiers / idées**

---

## Architecture & conception (1–20)

1. **Pourquoi un monolithe Express ?** — **Une API unique** pour mobile + web, transactions inter-domaines simples au début. — `backend/src/app.ts`
2. **Microservices alors ?** — **Pas indispensable** tant scaling mesuré inconnu ; coût ops élevé. — docker-compose replicas
3. **Où est la « couche métier » ?** — **Souvent dans `backend/src/services/**`** puis Prisma dans routes légères — à vérifier module par module.
4. **Comment évitez-vous god routes ?** — **Zod + services** séparent validation / règles — pattern récurrent `validateBody`.
5. **Diagramme de déploiement réel ?** — **Infra type Nginx + replicas** (`docker-compose.prod.yml`) — adapter à ce que vous avez réellement déployé.
6. **Pattern MVC ?** — **Router ≈ controller**, service ≈ logique, Prisma ≈ persistance — hybride pragmatique.
7. **Versionnement API ?** — **Vérifier** si routes mixtes `/api/...` sans `/v1` partout → dire honnêtement état migration.
8. **GraphQL futur ?** — **Possibilité gateway** mais REST + mobiles déjà équipées.
9. **Event-driven ?** — **Socket.IO événements** + jobs (`jobs/*.job.*`) mais pas Kafka déclaré.
10. **CQRS présent ?** — **Pas comme pattern systématique** sauf lectures optimisées isolées à montrer.
11. **Séparation PWA/mobile logique métier ?** — **Non : métier au backend** ; clients consommateurs.
12. **Réutilisation SDK ?** — **Mini SDK** dossier `sdk/afriwonder-miniapp-sdk` — lien extension écosystème.
13. **Public API ?** — **Route `publicApi.routes`** — préciser périmètre démo.
14. **Reverse proxy avant Express ?** — **Nginx** schémas compose prod — TLS termination.
15. **Health checks ?** — **`sendExtendedApiHealth`** import `app.ts` — expliquer champs observés réellement.
16. **Trust proxy pourquoi ?** — **`app.set('trust proxy',1)`** lecture IP client derrière LB.
17. **ETag forte impact ?** — **Revalidation cache conditionnelles** compatibles proxys.
18. **Idempotence globale ?** — **Webhooks** tests existants — ne pas généraliser à toutes routes sans preuve.
19. **File upload pipeline ?** — **Multer + Sharp** deps — risque DoS upload → limites taille à citer si connues.
20. **Observabilité beyond Sentry ?** — **Prometheus exposition service** import `app.ts` — dire ce que vous exposez réellement.

## Sécurité (21–35)

21. **JWT secret rotation ?** — **Process manuel** sauf preuve script — honnêteté.
22. **Refresh token stockage ?** — **Relire `auth.routes` / cookies** pour exactitude (ne pas improviser).
23. **Black list jti stockée où ?** — **Service dédié** (`accessTokenBlacklist.service.ts`) mentionné depuis auth middleware.
24. **CSRF sur mobile ?** — **Principalement surface cookie navigateur**.
25. **Helmet défaut suffisants ?** — **Baseline CSP à valider selon CDN asset** réel déployé.
26. **XSS réfléchi stocké ?** — **Sanitize back + vigilance rendu Markdown / rich text**.
27. **SSRF médias comment ?** — **Lire entièrement `proxy.routes.ts` avant oral** (question fréquente).
28. **Rate-limit auth brute force ?** — **`authLimiter`** import middleware.
29. **Payment abuse ?** — **`paymentLimiter`**, logique Stripe/OM webhook tests.
30. **Secrets git leak ?** — **Workflow `detect-secrets.yml`** existe — citez prévention CI.
31. **E2EE messaging readiness ?** — **Flags user `messaging_e2e_enabled`** schéma + routes `e2ee` — préciser niveau implémentation (commentaire schema « préférence »).
32. **CORS erreur classique ?** — **`CORS_ORIGIN` liste** commentaire `app.ts` — expliquer credentials.
33. **Cookie flags prod ?** — **secure / sameSite** — vérifier code set-cookie réel.
34. **Admin surface attack ?** — **Routes admin séparées** (`requireAdmin`) — principe least privilege.
35. **Dependency supply chain ?** — **`npm audit` CI mobile** + backend à confirmer job.

## Données & Prisma (36–45)

36. **Nombre modèles ?** — **~100 `model`** — ordre grandeur exact du schema versionnée.
37. **Migration downtime ?** — **Stratégie blue/green non prouvée** → expansion / backfill scripts existent → honnête.
38. **N+1 exemple ?** — **Préparer 1 flux feed ou commande avec `select`/`include`** ou dire « instrumentation future ».
39. **Index critiques ?** — **Pointer `@@index` dans schema vidéos/orders si expliqués** — lecture ciblée requise.
40. **Transactions wallet ?** — **Prisma `$transaction` dans services paiement** à localiser exemple réel avant jury.
41. **Soft delete présent ?** — **Chercher colonnes archived / timestamps** avant affirmation.
42. **JSON polymorphique dangers ?** — **Champs `Json?` user** gestion versioning schéma client.
43. **PG extensions ?** — **Indiquer si uuid / postgis** — non confirmé sans search.
44. **Backup stratégie ?** — **Hors code** — dire « politique infra à documenter » si non fourni.
45. **GDPR delete job ?** — **`startAccountDeletionJobs`** `index.ts` — expliquer principe différé.

## Temps réel & médias (46–55)

46. **Socket.IO auth ?** — **Relire handshake portion `index.ts`** (token query/cookie) sans inventer.
47. **Rooms identifiants ?** — **Clé conversation / user** — citer ce que code fait réellement.
48. **Reconnexion client ?** — **Backoff côté `socket.io-client`** config front — à vérifier.
49. **Redis adapter condition ?** — **Variable env** — si absent single instance seulement.
50. **Agora token server ?** — **`agora-token` dep backend** — expliquer que token généré serveur, média hors bande.
51. **WebRTC fallback ?** — **Dire limites réseaux symétriques NAT** à haut niveau.
52. **Live recording ?** — **À vérifier routes `live`** avant promesse.
53. **HLS vs MP4 ?** — **Ne pas bluffer** : montrer ce que `VideoCard`/upload pipeline fait réellement (PWA rules lock player).
54. **CDN usage ?** — **S3 presign** possible — décrire chemin upload download.
55. **Modération live auto ?** — **Ne pas confondre avec IA engine stub** — dire règles / humain / futur ML.

## Frontend PWA (56–62)

56. **Pourquoi pas Next ?** — **Stack Vite + react-router SPA** racine (`src/App.jsx`).
57. **State global auth ?** — **`AuthProvider`** fichier `AuthContext`.
58. **Offline queries ?** — **Persist TanStack Query** visible imports `App.jsx`.
59. **Feature flags ?** — **`FeatureFlagsProvider`**.
60. **Accessibilité ?** — **Radix primitives** baseline — audit Lighthouse manuel.
61. **i18n ?** — **TranslationProvider composant**.
62. **Performance scroll feed ?** — **Règles projet TikTok-like** sans modifier player — verbaliser buffering mobile web.

## Mobile Expo (63–68)

63. **Router file-based ?** — **`expo-router`** deps.
64. **Socket client scope ?** — **Présence dep** → usage messagerie.
65. **IAP sandbox ?** — **`react-native-iap`** configuration stores hors scope résumé vague OK.
66. **Probes backend Android ?** — **`getBackendOrigin` / rules workspace** très bonne question Mali LAN.
67. **Secure storage sensitive ?** — **`expo-secure-store`** présent deps.
68. **Maestro valeur ?** — **Smoke YAML** automatisation tactile.

## DevOps & CI (69–74)

69. **PR 400 lignes pourquoi ?** — **`pr-line-budget` job CI** ligne commentaire durability — discipline review.
70. **quality-gates scripts ?** — **`npm run verify:quality-gates`** racine.
71. **Playwright périmètre ?** — **Tests e2e subset ci.yml** réel fichier complet à parcourir.
72. **Render / Vercel deploy yml ?** — **Présents** — expliquer ce que VOUS utilisez.
73. **Docker prod compose services ?** — **Lister services réels** après ouverture fichier.
74. **Secrets runtime ?** — **`.env` backend** non commit — rappel AGENTS.

## IA & traduction (75–80)

75. **LibreTranslate fail ?** — **Fallback MyMemory** logique `translate.routes.ts`.
76. **Données externes traduction ?** — **Texte utilisateur part temporairement tiers** — mention conformité usage.
77. **AI models Prisma ?** — **Commentaire service : désactivé** — cohérent réponse honnête.
78. **Future RAG ?** — **Vision** si pas code — marquer prospective.
79. **BI routes ?** — **`businessIntelligence.routes`** — à ouvrir avant promesse dashboard.
80. **Search full-text ?** — **`search.routes`** — préciser moteur (SQL vs external).

---

**Fin annexe — compléter au fil des modules réellement montrés en démo.**
