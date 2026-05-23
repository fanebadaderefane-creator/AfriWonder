# AfriWonder — Standards d’ingénierie pour la durabilité

**Auteur cible** : toutes les équipes qui construisent le produit sur plusieurs années, pas seulement pour le sprint suivant.

## Source de vérité unique

Le texte intégral, structuré en 11 chapitres (architecture, tests, CI/CD, review, monitoring, scalabilité, sécurité, documentation, culture, feedback, checklist trimestrielle), est maintenu ici :

**[`ENGINEERING_STANDARDS.md`](./ENGINEERING_STANDARDS.md)** — *Standards d’ingénierie pour la durabilité · v1.1 · document vivant*

Ce fichier `DURABILITY_STANDARDS.md` est une **entrée sémantique** (recherche « durabilité », onboarding, audit) : il évite de dupliquer le contenu.

## Liens utiles

| Document | Rôle |
|----------|------|
| [`../AGENTS.md`](../AGENTS.md) | Version **courte** lue par les agents IA et les devs (10 commandements, DoD, budgets). |
| [`ENGINEERING_STANDARDS.md`](./ENGINEERING_STANDARDS.md) | **Manuel long** (références Google / Meta / etc., tableaux, rituels, métriques). |
| [`../frontend/README.md`](../frontend/README.md) | **Application mobile Expo** : commandes `verify`, couverture, `minSdk` 29, Sentry, liens vers le manuel. |
| [`DEPENDENCIES.md`](./DEPENDENCIES.md) | **Librairies clés** et justification (ch.1.1) — mobile Expo + rappel backend/PWA. |
| [`CLIENT_DELIVERY_CONTRACT.md`](./CLIENT_DELIVERY_CONTRACT.md) | Preuve de livraison côté client. |
| [`STANDARDS_CONFORMANCE_REPORT.md`](./STANDARDS_CONFORMANCE_REPORT.md) | Preuve technique : scripts CI/gates automatisés vs manuel. |
| [`OPERATIONAL_DIRECTIVE_LAUNCH.md`](./OPERATIONAL_DIRECTIVE_LAUNCH.md) | **Directive lancement** (tests obligatoires, P1/P2/P3, sign-off) — *niveau critique*. |

**Référence d’inspiration** (déclarée dans le manuel) : Google · Meta · Airbnb · WhatsApp · M-Pesa.

> *« Une grande plateforme ne naît pas grande. Elle est construite tous les jours, par des équipes qui refusent de baisser les standards. »*

---

*Index créé pour aligner la documentation du dépôt sur le libellé « standards de durabilité » sans maintenir deux manuels en parallèle.*
