# AFRIWONDER — Standards d'Ingénierie pour la Durabilité

> **Le manuel des équipes qui construisent pour des années, pas pour demain.**
> Version 1.1 — 2026-04-28 — Document vivant

> **Référence inspirée de** : Google · Meta · Airbnb · WhatsApp · M-Pesa
>
> *« Une grande plateforme ne naît pas grande. Elle est construite tous les jours, par des équipes qui refusent de baisser les standards. »*

Ce document est la **version longue et exécutable** de [`AGENTS.md`](../AGENTS.md). Il définit les standards non négociables qui s'appliquent à tout code écrit dans ce repo (backend, mobile, web, SDK).

**Recherche par mot-clé** : une entrée [`DURABILITY_STANDARDS.md`](DURABILITY_STANDARDS.md) pointe ici (évite deux manuels divergents).

## Mini sommaire (version PDF)

- **Objectif** : construire un produit AfriWonder durable, scalable et maintenable sur plusieurs années.
- **Périmètre** : architecture, qualité code, tests, CI/CD, review, monitoring, sécurité, culture, feedback.
- **Règles non négociables** : séparation des couches, tests automatiques, PR review, sécurité continue.
- **Seuils clés** : couverture >= 70 %, crash rate < 0.5 %, API P95 < 300 ms, APK < 50 MB.
- **Rythme d'exécution** : rituels équipe, revue dette, audits trimestriels/semestres, checklist trimestrielle.

### Scripts racine (preuve automatisée)

Voir [`STANDARDS_CONFORMANCE_REPORT.md`](STANDARDS_CONFORMANCE_REPORT.md) : `verify:quality-gates`, `verify:test-coverage`, `verify:release-readiness`, `verify:engineering-standards`.

---

## Table des matières

1. [Architecture & qualité du code](#1-architecture--qualité-du-code)
2. [Stratégie de tests automatisés](#2-stratégie-de-tests-automatisés)
3. [CI/CD — Déploiement continu](#3-cicd--déploiement-continu)
4. [Code review](#4-code-review)
5. [Monitoring & observabilité](#5-monitoring--observabilité)
6. [Scalabilité](#6-scalabilité)
7. [Sécurité continue](#7-sécurité-continue)
8. [Documentation vivante](#8-documentation-vivante)
9. [Culture d'ingénierie](#9-culture-dingénierie)
10. [Boucle de feedback utilisateurs](#10-boucle-de-feedback-utilisateurs)
11. [Checklist trimestrielle](#11-checklist-trimestrielle)

---

## Les 4 piliers d'un produit qui dure

| Pilier | Définition |
|---|---|
| **Architecture** | Solide, scalable, documentée |
| **Qualité** | Tests, review, zéro dette cachée |
| **Processus** | CI/CD, release, incident response |
| **Culture** | Standards, responsabilité |

---

## 1. Architecture & qualité du code

> *Les fondations qui permettent de construire sans tout casser.*
> WhatsApp servait 450 M d'utilisateurs avec 50 ingénieurs. La raison : une architecture pensée pour durer.
> Si les fondations sont mauvaises, chaque nouvelle fonctionnalité coûte 3× plus cher et casse 2× plus souvent.

### 1.1 Règles d'architecture obligatoires

| Règle | Standard | Pourquoi |
|---|---|---|
| Séparation des couches | UI / logique métier / données — jamais mélangées | Modifier l'UI sans toucher la base |
| Modules indépendants | Chaque feature = module isolé, déployable seul | Ajouter Paiement sans toucher le Feed |
| API versionnée | Toute API publique a une version : `/v1/`, `/v2/` | Mettre à jour sans casser les anciens clients |
| Configuration externalisée | Aucune constante hardcodée dans le code | Changer une URL sans recompiler |
| Pas de logique dans l'UI | L'écran affiche — il ne calcule pas | Tester la logique sans interface |
| Dépendances documentées | Chaque librairie tierce a une raison écrite ([`DEPENDENCIES.md`](DEPENDENCIES.md)) | Éviter les libs abandonnées sans le savoir |

### 1.2 Standards de code (non négociables)

- ✅ Tout code passe par un linter automatique — zéro exception.
- ✅ Toute fonction fait une seule chose — si elle en fait deux, la couper.
- ✅ Toute variable et fonction a un nom qui s'explique seul — pas de `x`, `temp`, `data2`.
- ✅ Aucun bloc de code dupliqué — si tu copies, tu crées une fonction.
- ✅ Toute logique complexe a un commentaire d'intention (le *pourquoi*, pas le *quoi*).
- ✅ Aucun `TODO` laissé sans ticket créé dans le backlog : `// TODO(AFW-1234): ...`.
- ✅ Taille de fichier max : **300 lignes** — au-delà, refactorisation obligatoire.

### 1.3 Gestion de la dette technique

> La dette technique, c'est l'intérêt que tu paieras sur un mauvais code écrit aujourd'hui.

| Pratique | Fréquence | Responsable |
|---|---|---|
| Sprint de refactorisation | 1 sprint / trimestre minimum | Lead technique |
| Revue de la dette backlog | Mensuelle | Toute l'équipe |
| Mise à jour des dépendances | Bi-mensuelle (Dependabot/Renovate) | Dev désigné |
| Revue des logs d'erreurs | Hebdomadaire | Dev de garde |
| Audit de sécurité | Semestrielle | Lead + externe |
| Revue des performances | Trimestrielle | Lead + backend |

**Règle absolue** : si la dette dépasse 20 % du backlog, le sprint suivant est entièrement dédié au remboursement.

---

## 2. Stratégie de tests automatisés

> *Ce qui n'est pas testé automatiquement sera cassé un jour.*
> Google exécute des millions de tests automatisés par jour. C'est pour ça qu'ils peuvent déployer 1 000× par an.

### 2.1 La pyramide des tests

```
        E2E (5-10 %)
        Lents · couvrent les parcours critiques complets
        Ex : inscription → publication → commentaire → notification
       ───────────────────────────
       Intégration (20-30 %)
       Vérifient que les modules fonctionnent ensemble
       Ex : l'API auth retourne le bon token au bon écran
       ─────────────────────────────────────
       Unitaires (60-70 %)
       Rapides · couvrent chaque fonction isolément
       Ex : la fonction de calcul du score retourne le bon résultat
```

### 2.2 Outils par couche

| Couche | Backend | Mobile | Web |
|---|---|---|---|
| Unitaires | Jest | Vitest + RNTL | Vitest + RTL |
| Intégration | Jest + supertest | Vitest + msw | Vitest + msw |
| E2E | Jest critical-path | Maestro | Playwright |

### 2.3 Règles de test obligatoires

- ✅ Toute nouvelle fonctionnalité livre ses tests unitaires dans le **même commit**.
- ✅ Couverture de code minimale : **70 %** — en dessous, la PR est rejetée automatiquement.
- ✅ Tout bug corrigé génère un test de régression — pour qu'il ne revienne jamais.
- ✅ Les tests E2E couvrent tous les parcours critiques : inscription, paiement, post, notification.
- ✅ Les tests tournent automatiquement sur chaque PR avant toute review humaine.
- ✅ Aucun test flaky toléré — un test qui passe une fois sur deux est supprimé ou corrigé.

### 2.4 Métriques cibles

| Métrique | Cible |
|---|---|
| Couverture de code minimale | ≥ 70 % par module |
| Tests flaky tolérés | 0 |
| Parcours critiques couverts E2E | 100 % |
| Durée max suite unit | < 5 min |

> Plan de progression : voir [`docs/COVERAGE.md`](COVERAGE.md).

---

## 3. CI/CD — Déploiement continu

> *Déployer vite, déployer souvent, sans jamais casser la prod.*
> Meta déploie du code plusieurs fois par jour. Ils ont un pipeline qui vérifie tout avant que ça touche les utilisateurs.

### 3.1 Pipeline obligatoire

| # | Étape | Condition pour continuer |
|---|---|---|
| 1 | Push du code | Branche protégée — jamais `main` directement |
| 2 | Lint automatique | 0 erreur — sinon bloqué |
| 3 | Tests unitaires | 100 % des tests passent |
| 4 | Tests intégration | 100 % des tests passent |
| 5 | Analyse sécurité | 0 vulnérabilité critique (npm audit + Snyk) |
| 6 | Build | Build réussie sans warnings |
| 7 | Code review | Approbation explicite (1+ senior) |
| 8 | Déploiement staging | Tests E2E passent |
| 9 | Déploiement prod | Release progressive (5 → 25 → 50 → 100 %) |

Implémentation actuelle : [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

### 3.2 Stratégie de release progressive

Comme Airbnb et Google, on ne déploie jamais à 100 % d'un coup.

```
5 % users  →  observer 24h  →
25 % users →  observer 24h  →
50 % users →  observer 24h  →
100 % users → complet
```

Si crash rate ou erreur dépasse le seuil à un palier → **rollback automatique immédiat**. Pas de discussion.

Voir [`docs/RELEASE_PROCESS.md`](RELEASE_PROCESS.md) *(Sprint 2)*.

### 3.3 Règles de versioning (Semantic Versioning)

Format : `MAJOR.MINOR.PATCH` (ex : `2.4.1`)

- **PATCH** (`2.4.1` → `2.4.2`) : correction de bug — rétrocompatible.
- **MINOR** (`2.4.1` → `2.5.0`) : nouvelle fonctionnalité — rétrocompatible.
- **MAJOR** (`2.4.1` → `3.0.0`) : changement cassant — migration nécessaire.

- ✅ Chaque version a un **changelog complet** ([`CHANGELOG.md`](../CHANGELOG.md), format Keep-a-Changelog).
- ✅ Chaque version est **taguée dans Git** — rollback possible en 5 minutes.
- ✅ La branche `main` est **toujours déployable** — jamais de code cassé en `main`.

---

## 4. Code review

> *Aucun code n'entre en production sans avoir été lu par un humain.*
> Chez Google, même les ingénieurs seniors font reviewer leur code.

### 4.1 Processus obligatoire

| Règle | Standard |
|---|---|
| Taille d'une PR | Maximum 400 lignes diff — au-delà, découper |
| Reviewers | 1 senior min, 2 pour features critiques (paiement, auth, KYC, modération) |
| Délai de review | Maximum 24 h — au-delà, c'est une urgence |
| Critères d'approbation | Logique correcte + tests + lisibilité + sécurité + DoD |
| Commentaires | Constructifs et précis — *« améliore ça »* n'est pas valable |
| Merge | Squash merge, jamais auto-merge sans approbation |
| Branches protégées | `main` et `develop` — push direct interdit |

### 4.2 Checklist du reviewer

- [ ] La logique est-elle correcte et sans cas extrêmes non gérés ?
- [ ] Les tests couvrent-ils les cas normaux ET les cas d'erreur ?
- [ ] Le code est-il lisible sans avoir à demander des explications ?
- [ ] Y a-t-il des risques de sécurité (injection, exposition de données) ?
- [ ] Les performances sont-elles acceptables (pas de N+1, pas de boucles inutiles) ?
- [ ] La PR respecte-t-elle les standards d'architecture définis ?
- [ ] La documentation est-elle à jour si nécessaire ?
- [ ] Aucune PII dans les logs ?
- [ ] Aucun secret commité ?

Template PR : [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).

---

## 5. Monitoring & observabilité

> *Tu ne peux pas améliorer ce que tu ne mesures pas.*
> Netflix sait qu'un serveur va tomber avant qu'il tombe — ils mesurent tout, en permanence.

### 5.1 Outils obligatoires en production

| Outil | Usage | Seuil d'alerte |
|---|---|---|
| Firebase Crashlytics | Crashs mobile temps réel | Crash rate > 0.5 % → alerte immédiate |
| Sentry | Erreurs JS / backend | Toute erreur non gérée → alerte |
| Analytics (PostHog) | Comportement, funnels | Baisse DAU > 10 % → investigation |
| Uptime monitor | Disponibilité APIs | Downtime > 1 min → alerte SMS |
| APM | Temps de réponse APIs | Latence > 500 ms → investigation |
| Logs centralisés (Pino) | Tous les logs en un endroit | Erreur 5xx > 1 % → alerte |

### 5.2 Métriques clés

| Métrique | Cible |
|---|---|
| Taux de crash | < 0.5 % |
| Uptime | 99.9 % (8 h downtime/an max) |
| Latence API P95 | < 300 ms |
| Rétention J7 | > 40 % |

### 5.3 Protocole d'incident

| Sévérité | Définition | Temps de réponse | Qui agit |
|---|---|---|---|
| **SEV-1** | App inaccessible / crash massif / fuite données | 5 min | Tout le monde disponible |
| **SEV-2** | Feature majeure cassée / dégradation forte | 30 min | Lead + dev concerné |
| **SEV-3** | Comportement incorrect non bloquant | 4 h | Dev assigné |
| **SEV-4** | Bug mineur / cosmétique | Prochain sprint | Dev assigné |

- Tout SEV-1/SEV-2 → **post-mortem écrit dans les 48 h** ([`docs/POSTMORTEM_TEMPLATE.md`](POSTMORTEM_TEMPLATE.md)).
- Le post-mortem analyse la cause racine — **pas les personnes coupables**.
- Chaque post-mortem génère des actions correctives trackées dans le backlog.

Voir [`docs/INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

---

## 6. Scalabilité

> *Ce qui tient pour 1 000 users doit tenir pour 1 000 000.*
> Twitter a failli mourir sous sa propre croissance en 2008.

### 6.1 Budgets de performance (limites absolues)

| Métrique | Limite | Action si dépassé |
|---|---|---|
| Démarrage app (cold start) | < 2 s | Optimisation obligatoire avant release |
| Chargement écran (cache chaud) | < 1 s | Lazy loading + revue archi |
| Réponse API critique (P95) | < 300 ms | Optim backend / index DB / CDN |
| Taille APK / IPA | < 50 MB | Audit assets + suppression |
| Consommation mémoire | < 150 MB en utilisation normale | Audit fuites mémoire |
| Taille image après compression | < 200 KB | Pipeline `sharp` obligatoire |
| Scroll feed | 60 FPS constant | Virtualisation + memoization |

Voir [`docs/PERFORMANCE_BUDGETS.md`](PERFORMANCE_BUDGETS.md) *(Sprint 3)*.

### 6.2 Pratiques obligatoires

- ✅ Base de données : **indices** sur toutes les colonnes filtrées ou joinées.
- ✅ **Pagination obligatoire** : aucune liste retourne > 50 items sans pagination.
- ✅ **Cache** pour toutes les données rarement modifiées (profils, configs, catégories).
- ✅ **Images via CDN** (Cloudflare R2) — jamais directement depuis le serveur principal.
- ✅ Opérations lourdes **asynchrones** (queue, workers) — jamais dans le thread principal.
- ✅ Charge testée avec **k6/Locust** avant chaque release majeure.
- ✅ Architecture préparée pour **sharding horizontal** dès le départ.

### 6.3 Test de charge obligatoire avant release majeure

| Scénario | Volume | Résultat attendu |
|---|---|---|
| Connexion simultanée | 500 utilisateurs | 0 erreur, latence < 500 ms |
| Upload de contenu | 100 simultanés | 0 échec, file gérée |
| Feed scroll intensif | 1 000 req/min | Pas de dégradation > 20 % |
| Pic soudain (viral) | 10× le trafic normal en 1 min | Autoscaling déclenché, 0 crash |

Implémentation : `npm run load-test:1000rps --prefix backend`.

---

## 7. Sécurité continue

> *La sécurité n'est pas une fonctionnalité — c'est une obligation permanente.*
> LinkedIn a perdu 117 M de mots de passe en 2012. Uber a caché une fuite de données pendant un an.

### 7.1 Règles absolues

| Domaine | Règle obligatoire |
|---|---|
| Mots de passe | Hashés avec **bcrypt/Argon2** — jamais en clair, jamais MD5 |
| Tokens JWT | Expiration courte (**15 min** access) + refresh token sécurisé |
| Données sensibles | Chiffrées au repos ET en transit (**TLS 1.3** minimum) |
| Inputs utilisateur | Validés et sanitisés côté serveur (**Zod**) — jamais faire confiance au client |
| Secrets / clés API | **Jamais dans le code** — variables d'environnement uniquement |
| Autorisations | **Principe du moindre privilège** — chaque rôle accède à ce qu'il faut |
| Logs | **Aucune PII** dans les logs (ni email, ni téléphone, ni token) — `userId` uniquement |
| Dépendances | Scan automatique (`npm audit`, Snyk, Dependabot) |

### 7.2 RGPD & protection des données (Mali/Afrique)

- ✅ Chaque utilisateur peut télécharger ses données sur demande.
- ✅ Chaque utilisateur peut supprimer son compte et toutes ses données.
- ✅ Politique de confidentialité claire, en français, lisible.
- ✅ Consentement explicite pour notifications push et tracking analytics.
- ✅ Données stockées en conformité avec les lois locales applicables.

### 7.3 Audit de sécurité semestriel

- Test de pénétration (pentest) externe ou outil automatisé.
- Revue de tous les endpoints API — vérification des droits d'accès.
- Simulation de phishing / ingénierie sociale pour l'équipe.
- Revue des logs d'accès pour détecter des comportements anormaux.

Voir [`docs/SECURITY.md`](SECURITY.md) et [`docs/SECURITY_AUDIT_CHECKLIST.md`](SECURITY_AUDIT_CHECKLIST.md).

---

## 8. Documentation vivante

> *Un code non documenté appartient à celui qui l'a écrit. Pas à l'équipe.*

### 8.1 Documents obligatoires

| Document | Contenu | Mise à jour |
|---|---|---|
| [README.md](../README.md) | Setup, architecture, conventions | À chaque changement majeur |
| [docs/decisions/](decisions/) (ADR) | Pourquoi chaque décision technique | À chaque décision |
| Documentation API | Endpoints, params, réponses (Swagger/OpenAPI) | À chaque modification |
| [RUNBOOK.md](RUNBOOK.md) | Comment déployer, rollback, répondre aux incidents | Trimestrielle |
| [GLOSSARY.md](GLOSSARY.md) | Définitions communes | À chaque nouveau concept |
| [ONBOARDING.md](ONBOARDING.md) | Productif en 2 jours | Trimestrielle |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Chaque lib + raison | À chaque ajout |

> **Règle** : un document non maintenu est pire qu'aucun document — il induit en erreur. Si tu ne peux pas le maintenir, supprime-le.

### 8.2 ADR (Architecture Decision Records)

Chaque décision structurelle laisse une trace dans `docs/decisions/NNNN-titre-court.md` selon le format suivant :

```markdown
# NNNN — Titre court

- **Date** : YYYY-MM-DD
- **Status** : Proposed | Accepted | Deprecated | Superseded by NNNN
- **Décideur** : @nom

## Contexte
Quel problème résout-on ? Quelles contraintes ?

## Décision
Ce qu'on fait, en une phrase.

## Alternatives écartées
- Option A : pourquoi écartée
- Option B : pourquoi écartée

## Conséquences
- Positives
- Négatives / dette acceptée
```

---

## 9. Culture d'ingénierie

> *Les outils font les processus. La culture fait les équipes.*
> Amazon, Stripe, Linear ont des cultures si fortes que les nouveaux suivent les standards sans qu'on leur demande.

### 9.1 Rituels d'équipe obligatoires

| Rituel | Fréquence | Objectif |
|---|---|---|
| Stand-up | Quotidien — 15 min max | Synchronisation, blocages |
| Sprint planning | Toutes les 2 semaines | Prioriser et estimer |
| Sprint retrospective | Toutes les 2 semaines | Améliorer en continu |
| Tech talk | Mensuel — 30 min | Partager une découverte, un outil |
| Revue de la dette | Mensuelle | Identifier ce qui ralentit |
| Demo day | Fin de chaque sprint | Montrer ce qui a été livré |

### 9.2 Les 10 commandements (rappel)

Liste canonique AfriWonder : voir [`AGENTS.md` §2 — Les 10 commandements](../AGENTS.md#2-les-10-commandements-non-négociables).

### 9.3 Mobile — spécificités Afrique & Mali

- Supporter **Android 10+** minimum (>80 % du marché Mali).
- **Mode hors-ligne partiel** : l'app reste utilisable sans connexion.
- Tester sur appareils **2-3 GB RAM** — pas sur des flagships.
- **Compression d'images agressive** : les données mobiles coûtent cher au Mali.
- UI conçue pour **écrans 5"** avec des doigts — pas une souris.
- **Localisation complète** : français, FCFA, +223, format JJ/MM/AAAA.
- **Taille APK < 50 MB** — les utilisateurs suppriment les apps trop lourdes.

---

## 10. Boucle de feedback utilisateurs

> *Les grandes plateformes ne devinent pas — elles écoutent.*

### 10.1 Système de collecte du feedback

| Canal | Comment | Fréquence de traitement |
|---|---|---|
| In-app feedback | Bouton « Signaler un problème » dans chaque écran | Quotidienne |
| Notation app store | Lire ET répondre à tous les avis 1-3 étoiles | Hebdomadaire |
| Interviews utilisateurs | 5 utilisateurs réels par mois — écouter, pas vendre | Mensuelle |
| Analytics comportemental | Analyser funnels de conversion et rétention | Hebdomadaire |
| Tests A/B | Tester nouvelles features sur 10 % avant généralisation | À chaque release majeure |

- ✅ Chaque feedback entrant est catégorisé et priorisé dans le backlog.
- ✅ Les utilisateurs qui ont signalé un bug sont notifiés quand il est corrigé.
- ✅ Chaque sprint inclut **au moins un item issu du feedback utilisateur**.

---

## 11. Checklist trimestrielle

À cocher chaque trimestre par le lead technique :

- [ ] Architecture revue — aucune dette cachée accumulée.
- [ ] Couverture de tests ≥ 70 % — mesurée et documentée.
- [ ] Toutes les dépendances mises à jour — aucune vulnérabilité critique.
- [ ] Budget de performance respecté — métriques vérifiées.
- [ ] Audit de sécurité effectué — actions correctives trackées.
- [ ] Documentation à jour — README, ADR, API docs.
- [ ] Post-mortems des incidents analysés — actions implémentées.
- [ ] Feedback utilisateurs priorisés dans le backlog.
- [ ] Test de charge exécuté avant toute release majeure.
- [ ] Monitoring vérifié — toutes les alertes fonctionnelles.
- [ ] Onboarding guide à jour — un nouveau dev peut démarrer en 2 jours.
- [ ] Rétention J7 ≥ 40 % — sinon investigation prioritaire.

---

## Ce qui différencie les produits qui durent

> Ce ne sont pas les fonctionnalités.
> Ce ne sont pas les technologies.
> C'est la **discipline quotidienne** de faire les choses correctement, **même quand personne ne regarde**.
>
> Chaque commit. Chaque review. Chaque test. Chaque feedback.
>
> *C'est ça, construire pour des années.*

---

**Document vivant — version 1.1 — 2026-04-28**

Toute proposition d'amendement passe par une PR avec 2 reviewers seniors et un ADR si la décision est structurelle.
