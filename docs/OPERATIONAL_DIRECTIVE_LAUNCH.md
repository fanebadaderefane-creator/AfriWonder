# Directive opérationnelle — lancement AfriWonder

**Niveau : critique** — exigence produit/QA, pas une suggestion.  
**Marché cible :** Mali (lancement) → Afrique francophone.

---

## Métadonnées (à remplir avant exécution)

| Champ | Valeur |
|--------|--------|
| Deadline (freeze) | `[DATE] à [HEURE]` — **à fixer par le lead** |
| Code freeze | Après la deadline, toute modification est validée par le lead. |
| Outil de suivi bugs | **GitHub Issues** (dépôt AfriWonder) — template *Bug report* : [`.github/ISSUE_TEMPLATE/bug_report.yml`](../.github/ISSUE_TEMPLATE/bug_report.yml) (priorité **P1 / P2 / P3** + SEV). |
| Contact urgence (P1) | `[Nom, canal]` — **à renseigner** |
| Canal alertes Sentry / crash | Projet Sentry lié au DSN prod · config mobile : `EXPO_PUBLIC_SENTRY_DSN`, `initMobileSentry` dans `frontend/app/_layout.tsx` → `frontend/src/lib/sentryMobile.ts`. `[Canal d’alerte équipe]` **à renseigner**. |
| Responsable garde 24h post-lancement | `[Nom]` — **à renseigner** |
| Dernière preuve automatisée (CI locale) | Gate complet : `npm run verify:delivery` (racine). **Contrôle ciblé réussi** : `npm run test:smoke --prefix backend`, `npm run typecheck --prefix frontend`. Réexécuter avant sign-off final. |

**Liens internes :** inventaire écrans et modules → [`OPERATIONAL_DIRECTIVE_FEATURE_INVENTORY.md`](./OPERATIONAL_DIRECTIVE_FEATURE_INVENTORY.md) · checklist store → [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md)

### Alignement côté code (dépôt) — distinct du sign-off QA manuel

Quand le lead valide que **le code est aligné** avec cette directive, les points suivants sont **traçables dans le repo** (à ne pas confondre avec les tests manuels §1 et la checklist finale).

| Exigence directive | Où c’est porté dans le dépôt |
|--------------------|--------------------------------|
| §6 Timeouts API, pas d’attente infinie | `frontend/src/api/client.ts` — `timeout: 30000`, refresh token sur 401 |
| §6 Erreurs interceptées côté app | interceptors `apiClient` + écrans (ex. auth) avec messages utilisateur |
| §6 Validation serveur | `backend/src/schemas/*.ts` + routes Express associées |
| §4 Dates / monnaie Mali (JJ/MM/AAAA, FCFA) | `frontend/src/utils/formatDate.ts`, `frontend/src/utils/formatMoney.ts` |
| §7 / §10 Crash monitoring mobile | `frontend/src/lib/sentryMobile.ts`, `initMobileSentry` dans `frontend/app/_layout.tsx`, `EXPO_PUBLIC_SENTRY_DSN` |
| §8 Process bugs | GitHub — [`.github/ISSUE_TEMPLATE/bug_report.yml`](../.github/ISSUE_TEMPLATE/bug_report.yml) |
| Preuve automatisée livrable | Racine : `npm run verify:delivery` · backend : `npm run test:smoke --prefix backend` |

**Non couvert par le seul dépôt :** scénarios §3–§4 (3G, 30 min, Android &lt; 3 Go, multitâche), §5 bouton par bouton, §1 inventaire complet — **obligatoires en QA manuelle** avant de cocher la checklist sign-off.

---

## Objectif produit

Livrer une application **stable, fluide, rapide, complète, intuitive et scalable** pour des utilisateurs réels — produit fini, pas bêta ni prototype.

---

## 1. Test complet — périmètre obligatoire

Chaque zone ci-dessous doit être **testée manuellement** (ou équivalent documenté) pour la release. Les écrans concrets à parcourir sont listés dans l’[inventaire](OPERATIONAL_DIRECTIVE_FEATURE_INVENTORY.md).

| # | Domaine | Ce qui doit être vérifié |
|---|----------|---------------------------|
| 1 | Authentification | Inscription, connexion, déconnexion, mot de passe oublié, validation des champs |
| 2 | Profil utilisateur | Création, édition, photo, affichage public / privé |
| 3 | Navigation | Tous les onglets, transitions, retour, deep links |
| 4 | Feed / découverte | Chargement, scroll / infini, rafraîchissement |
| 5 | Interactions sociales | Like, commentaire, partage, follow / unfollow, notifications liées |
| 6 | Recherche | Barre, résultats, filtres, cas vide |
| 7 | Notifications | Push, in-app, lecture, suppression |
| 8 | Messagerie | Envoi, réception, lecture, médias si applicable |
| 9 | Paramètres | Tous les toggles, préférences, suppression de compte |
| 10 | Gestion des erreurs | Chaque formulaire, action réseau, état vide, message clair (pas de jargon technique) |
| 11 | Fonctionnalités AfriWonder | **Toutes** les surfaces listées dans l’inventaire + tout module activé en prod (feature flags) |

**Règle :** fonction incomplète → la terminer · bugguée → corriger · absente du scope lancement → retirer ou masquer proprement · mal conçue → améliorer.

**Remontée de bug :** modèle GitHub **Bug report** (champ *Priorité directive lancement* P1 / P2 / P3).

---

## 2. Priorisation des bugs (hiérarchie stricte)

| Priorité | Définition | Action |
|----------|------------|--------|
| **P1** — BLOQUANT | Crash, écran inaccessible, perte de données, boucle infinie | Stopper · corriger · alerter le lead |
| **P2** — MAJEUR | Fonction incorrecte, erreur visible, mauvais comportement | Corriger **avant** le freeze |
| **P3** — MINEUR | Texte, alignement, couleur, espacement | Documenter · corriger si le temps le permet |

**P3 non corrigé :** acceptable. **P1 non corrigé :** non publiable.

**Correspondance indicative** avec les niveaux SEV du repo (`AGENTS.md`) : P1 ≈ SEV-1, P2 ≈ SEV-2, P3 ≈ SEV-3/4.

---

## 3. Stabilité et performance

- Rapide : chargement cible **moins de 2 s**, transitions fluides (réseau réaliste).  
- Stable : 0 crash en session prolongée.  
- Résiliente : 3G / 2G simulé — pas de crash, pas de chargement infini.  
- Optimisée : pas de fuite mémoire évidente, navigation rapide sans lag inacceptable.

**Scénarios obligatoires :** réseau lent · coupure en cours d’action (message explicite) · **≥ 30 min** d’utilisation continue · enchaînement **≥ 5** écrans · listes / images denses · **arrière-plan / retour app** (état cohérent) · **Android entrée de gamme** (RAM inférieure à 3 Go, Android 10+) · **iOS minimum** supporté par le projet (voir `app.json` / EAS).

---

## 4. Appareils cibles et localisation (Mali)

- Tests sur **Android entrée de gamme** (Tecno, Infinix, Samsung A, etc.), pas seulement iPhone haut de gamme.  
- 3G simulé **et** coupure réseau.  
- Petite / grande diagonale si le thème le permet.  

**Mali :** français correct · indicatif **+223** · monnaie **FCFA** · dates **JJ/MM/AAAA** où applicable.

---

## 5. UI / UX (non négociable)

- Cohérence visuelle, pas d’écran « cassé ».  
- **Aucun** message technique côté utilisateur (ex. stack trace, noms d’API internes).  
- Boutons réactifs, formulaires validés, **chargement** et **vides** explicites.

| Interdit (exemples) | Correct |
|---------------------|--------|
| `municipalitéHandlerError` | « Une erreur est survenue. Réessayez. » |
| `null reference` | « Impossible de charger votre profil. » |
| `Network timeout 408` | « Vérifiez votre connexion internet. » |

Réf. interne : [`ERROR_MESSAGE_GUIDELINES.md`](./ERROR_MESSAGE_GUIDELINES.md) si présent.

---

## 6. Backend et API

- Endpoints critique path : pas de 500 en usage normal.  
- Erreurs **interceptées** côté app, messages **humains**.  
- **Timeouts** : pas d’attente infinie.  
- **Sauvegardes DB** et procédure restore documentées (ops / lead).  
- **Pas** de PII / secrets dans logs ou réponses.  
- Sessions / refresh : comportement **prévisible**.  
- **Validation Zod (ou équivalent) côté serveur** sur les routes concernées.

---

## 7. Fiabilité et sécurité

- Erreurs gérées ou remontées (Sentry) — pas de crash silencieux.  
- Données utilisateur chiffrées / protégées selon le modèle du produit.  
- Permissions (caméra, localisation, notifications) demandées et gérées proprement.  
- Interruptions (appel entrant, réseau coupé) sans état corrompu.

---

## 8. Processus de remontée des bugs

Chaque bug est tracé dans **l’outil désigné** (voir métadonnées), pas sur messagerie informelle seule.

**Champs minimum :** titre · **P1 / P2 / P3** · écran / route · étapes de repro · attendu / observé · statut · assignation.

**GitHub :** *Issues → New issue → Bug report* (priorité lancement requise).

---

## 9. Plan de contingence

À **`[HEURE - 2h]`** avant le freeze (à fixer avec le lead) : si un **P1** est encore ouvert → **alerter le lead** immédiatement. Décision : correctif / désactivation propre de la feature / report — **aucune** décision P1 seule côté dev junior.

**Règle d’or :** une mauvaise nouvelle communiquée tôt vaut mieux qu’une surprise en production.

---

## 10. Monitoring post-lancement

- **Sentry** (ou Crashlytics) actif sur build release, DSN / projet prod vérifiés.  
- **Alertes** reçues sur le canal designé.  
- Procédure **hotfix** connue (branche, build EAS, rollout).  
- Voir aussi `PRE_LAUNCH_CHECKLIST.md` (Phase B) et `frontend` Sentry : `initMobileSentry` dans `app/_layout.tsx`.

---

## Checklist de validation finale (sign-off)

- [ ] Toutes les lignes de la **section 1** + inventaire : testés manuellement (ou preuve documentée).  
- [ ] **Aucun P1** ouvert · **Aucun P2** non arbitré (corrigé ou accepté par le lead).  
- [ ] Aucun texte d’erreur technique visible utilisateur.  
- [ ] Test sur **Android entrée de gamme** réel.  
- [ ] Test sur **3G** (ou throttling) simulé.  
- [ ] Formulaires : cas limites.  
- [ ] Erreurs API gérées proprement.  
- [ ] Sentry (ou équivalent) **opérationnel** en prod.  
- [ ] **Sauvegarde base** validée côté ops.  
- [ ] Français / formats Mali vérifiés.  
- [ ] Parcours principal **de bout en bout** sans blocage.  
- [ ] Rapport envoyé au lead **avant** `[HEURE FREEZE]`.

| Validé par | Rôle | Date & heure |
|------------|------|--------------|
| | Lead technique / QA | |

---

*Document sans doublon opérationnel — aligné processus lancement. Pour le gel du code, respecter la date inscrite en tête de fichier une fois remplie.*
