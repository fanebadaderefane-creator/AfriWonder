# Présentation Fonctionnelle de la Plateforme AfriWonder

**Document destiné à :** InTouch — équipes Business, Juridique, Conformité et Intégration  
**Émetteur :** FANE BADADERE FANE GLOBAL (FBF GLOBAL)  
**Date :** juin 2026  
**Version :** 1.5 — document fonctionnel (hors détails techniques confidentiels)

---

## Résumé exécutif

**AfriWonder** est une plateforme numérique multi-services développée par **FBF GLOBAL** et accessible principalement via une **application mobile Android déjà publiée et disponible sur Google Play**. L'application est actuellement disponible sur **Google Play Store** et constitue le **principal canal d'accès** à la plateforme. La plateforme combine marketplace, création de contenu, live streaming, services numériques et paiements intégrés.

AfriWonder est **développé et exploité par FBF GLOBAL**, entreprise **enregistrée au Mali**.

AfriWonder est actuellement en phase de **déploiement commercial** et d'**intégration de partenaires stratégiques** afin d'étendre ses services financiers et transactionnels.

Dans le cadre de son développement, AfriWonder souhaite intégrer les solutions de paiement Mobile Money via **InTouch** afin de permettre l'encaissement des paiements utilisateurs et, à terme, le reversement des revenus des créateurs et vendeurs.

Le présent document présente le périmètre fonctionnel du projet ainsi que les cas d'utilisation prévus pour les services de paiement.

---

## Sommaire

1. [Présentation de l'entreprise](#1-présentation-de-lentreprise)
2. [Présentation d'AfriWonder](#2-présentation-dafriwonder)
3. [Fonctionnalités principales](#3-fonctionnalités-principales)
4. [Cas d'utilisation des APIs de paiement](#4-cas-dutilisation-des-apis-de-paiement)
5. [Modèle de monétisation](#5-modèle-de-monétisation)
6. [Besoins de paiement](#6-besoins-de-paiement)
7. [Conformité et sécurité](#7-conformité-et-sécurité)
8. [Conclusion et perspectives de partenariat](#8-conclusion-et-perspectives-de-partenariat)

---

## 1. Présentation de l'entreprise

| Élément | Information |
|--------|-------------|
| **Raison sociale** | FANE BADADERE FANE GLOBAL (FBF GLOBAL) |
| **Pays d'implantation** | République du Mali |
| **Activité** | Conception, développement et exploitation de solutions numériques ; édition et exploitation de la plateforme **AfriWonder** |
| **Positionnement** | Acteur technologique local visant l'inclusion numérique et la monétisation des usages mobiles en Afrique de l'Ouest |

FBF GLOBAL conçoit et opère AfriWonder comme produit phare : une super-application mobile et web destinée au grand public, aux créateurs de contenu, aux commerçants et aux prestataires de services.

---

## 2. Présentation d'AfriWonder

### 2.1 Vision produit

**AfriWonder** est une **super-application multi-services** permettant de centraliser commerce, contenu, paiements et services numériques au sein d'un même écosystème : un compte unique, un suivi du **compte utilisateur AfriWonder** et des transactions, et plusieurs services métiers accessibles depuis une même application.

L'objectif est de regrouper, pour les utilisateurs africains — en priorité au Mali — les usages du quotidien : social et vidéo, commerce, live, services locaux et paiements Mobile Money, dans une expérience adaptée aux réseaux mobiles et aux terminaux grand public.

**Contrairement à un projet en phase de conception**, AfriWonder est **déjà opérationnel** et accessible au public via son **application mobile Android déjà publiée et disponible sur Google Play**.

### 2.2 Canaux de distribution

| Canal | Rôle | Statut |
|-------|------|--------|
| **Application mobile Android** | Canal principal d'usage et de croissance | Application mobile Android déjà publiée et disponible sur Google Play |
| **Version Web / PWA** | Canal secondaire (navigateur, installation progressive) | Disponible ; même compte utilisateur |
| **Backend unifié** | Authentification, paiements, catalogue, contenus, messagerie | **Un seul backend** sert les deux canaux |

Les utilisateurs peuvent ainsi accéder aux mêmes fonctionnalités et au même compte utilisateur (historique des opérations), qu'ils utilisent l'application Android ou la version web.

### 2.3 Public cible et zone géographique

- **Utilisateurs finaux** : grand public, jeunes créateurs, acheteurs en ligne, participants aux lives.
- **Professionnels** : vendeurs marketplace, prestataires de services, organisateurs d'événements, restaurateurs et transporteurs (selon modules activés).
- **Zone prioritaire** : Mali, avec extension progressive vers l'Afrique de l'Ouest (Sénégal, Côte d'Ivoire, Burkina Faso, etc.).

### 2.4 Principes fonctionnels (sans détail technique)

- Compte utilisateur sécurisé permettant de **suivre le compte utilisateur, les paiements et les transactions** effectués sur la plateforme (libellés et montants en FCFA).
- Historique des opérations et traçabilité pour l'utilisateur et pour la conformité.
- Paiements par **Mobile Money** (Orange Money, Wave, Moov Money, MTN, selon opérateurs couverts par le partenaire agrégateur) et, le cas échéant, via le **compte utilisateur AfriWonder** déjà alimenté après encaissement Mobile Money.
- Répartition automatique des montants entre **plateforme**, **créateurs** et **marchands**, selon le type d'opération.

---

## 3. Fonctionnalités principales

Les modules ci-dessous sont opérationnels ou en déploiement progressif au sein de la même application. Ils partagent l'identité utilisateur, la messagerie et le compte utilisateur (historique des opérations).

### 3.1 Marketplace (achat et vente)

- Catalogue produits, panier, commandes et suivi de livraison.
- Paiement à la commande par Mobile Money ou via le **compte utilisateur AfriWonder**.
- Mécanisme de **séquestre (escrow)** : les fonds sont sécurisés jusqu'à confirmation de la transaction, puis reversés au vendeur selon les règles commerciales.
- Abonnements optionnels pour vendeurs (visibilité, outils pro).

### 3.2 Live streaming et Live commerce

- Diffusion en direct (vidéo) avec audience en temps réel.
- **Cadeaux virtuels** et interactions payantes pendant le live.
- **Live commerce** : présentation et vente de produits pendant une session live.
- Rechargement du compte utilisateur ou unités d'usage liées au live, alimentées par Mobile Money.

### 3.3 Créateurs de contenu

- Publication de vidéos courtes (fil type réseau social).
- Profils créateurs, abonnements payants, contenus réservés aux abonnés.
- Statistiques et tableau de bord revenus pour les créateurs.

### 3.4 Dons (Tips) et soutien

- Dons ponctuels sur vidéos ou profils créateurs.
- Montants libres ou forfaits, avec confirmation de paiement côté opérateur Mobile Money.

### 3.5 Abonnements créateurs

- Abonnements mensuels (ou périodiques) à un créateur.
- Renouvellement et gestion du statut abonné dans l'application.

### 3.6 Services numériques

- Réservation et paiement de prestations (services locaux, formations, événements, factures utilitaires, etc.).
- Paiement via le **compte utilisateur AfriWonder** ou initiation directe Mobile Money selon le parcours.

### 3.7 Compte utilisateur et paiements

- Consultation du **compte utilisateur** et de l'historique des opérations.
- **Rechargement (Cash In)** du compte utilisateur via opérateurs Mobile Money.
- Paiements internes (marketplace, services, pourboires) via le **compte utilisateur AfriWonder**.
- **Reversements (Cash Out / Payout)** : demande par les créateurs et vendeurs — voir section 6 (besoin futur renforcé via partenaire).

### 3.8 Autres briques de l'écosystème (contexte)

Messagerie et appels, événements et billetterie, crowdfunding, actualités, modules locaux (transport, restauration, santé, etc.) complètent l'offre super-app ; les flux de paiement décrits en section 4 s'appliquent selon le module concerné.

---

## 4. Cas d'utilisation des APIs de paiement

Cette section décrit **ce que la plateforme doit pouvoir faire** avec un agrégateur type InTouch (encaissement Mobile Money, statuts de transaction, notifications). Aucun détail d'intégration technique n'est fourni ici.

### 4.a — Rechargement du compte utilisateur

**Acteur :** utilisateur final  
**Objectif :** alimenter le **compte utilisateur AfriWonder** depuis son compte Mobile Money.

**Parcours fonctionnel :**

1. L'utilisateur choisit « Recharger » et saisit le montant souhaité.
2. Il sélectionne l'opérateur (Orange Money, Wave, Moov Money, etc.).
3. Il valide sur son téléphone (USSD, application opérateur ou parcours agrégateur).
4. En cas de succès, le compte utilisateur est mis à jour et une ligne apparaît dans l'historique (« Recharge »).

**Besoin agrégateur :** initiation de paiement (Cash In / collecte), callback ou notification de succès/échec, référence de transaction unique.

---

### 4.b — Paiement des achats sur la marketplace

**Acteurs :** acheteur, vendeur, plateforme  
**Objectif :** régler une commande produits en ligne.

**Parcours fonctionnel :**

1. L'acheteur valide son panier (adresse, montant total TTC en FCFA).
2. Il choisit le mode de paiement : Mobile Money (par opérateur) ou **compte utilisateur AfriWonder**.
3. Si Mobile Money : redirection ou demande de confirmation sur le terminal mobile ; via le compte utilisateur AfriWonder : débit immédiat si le compte dispose de fonds suffisants.
4. Après confirmation du paiement, la commande passe au statut « payée » ; les fonds sont gérés selon le modèle escrow puis libérés au vendeur après livraison / confirmation.
5. La plateforme applique ses règles commerciales (voir section 5).

**Besoin agrégateur :** paiement marchand avec montant, référence commande, statut final ; idéalement support multi-opérateurs pour un même parcours checkout.

---

### 4.c — Paiement de services numériques

**Acteurs :** client, prestataire (ou organisateur), plateforme  
**Objectif :** payer une prestation (réservation service, formation, billet événement, facture, etc.).

**Parcours fonctionnel :**

1. Le client sélectionne un service et un créneau ou une offre tarifée.
2. Un acompte ou le montant total est exigible à la réservation.
3. Paiement par Mobile Money ou via le **compte utilisateur AfriWonder**, avec même logique de confirmation et d'historique.
4. Le prestataire est rémunéré sur son compte vendeur/créateur après validation métier ; la plateforme applique ses règles de répartition.

**Besoin agrégateur :** encaissement avec libellé métier (référence réservation / service), gestion des statuts pending / paid / failed.

---

### 4.d — Dons et soutien aux créateurs de contenu

**Acteurs :** spectateur ou fan, créateur, plateforme  
**Objectif :** envoyer un don ponctuel (tip) en FCFA.

**Parcours fonctionnel :**

1. Depuis une vidéo ou un profil, l'utilisateur choisit « Soutenir » / « Faire un don ».
2. Il saisit le montant et son numéro Mobile Money si paiement direct opérateur.
3. Après validation opérateur, le montant est réparti entre **créateur** et **plateforme** selon les règles commerciales en vigueur.
4. Le créateur voit l'enregistrement sur son compte vendeur/créateur ; possibilité de reversement ultérieur (section 6).

**Besoin agrégateur :** collecte rapide, faible friction UX, notification temps réel pour mettre à jour le compte créateur côté plateforme.

---

### 4.e — Paiements pendant le live streaming et le live commerce

**Acteurs :** spectateur, animateur live, vendeur (live commerce), plateforme  
**Objectif :** monétiser l'audience en direct (cadeaux, achats flash).

**Parcours fonctionnel :**

1. **Pendant un live :** le spectateur envoie un cadeau virtuel ou un montant forfaitaire ; le paiement peut transiter par rechargement du compte utilisateur puis débit, ou par paiement Mobile Money direct selon le parcours.
2. **Live commerce :** produit mis en avant pendant le live ; l'acheteur commande et paie via les mêmes rails (Mobile Money ou compte utilisateur AfriWonder).
3. Les revenus sont attribués au créateur / vendeur selon les règles commerciales de la plateforme.

**Besoin agrégateur :** volumes potentiellement nombreux de petits montants ; latence faible pour confirmation ; réconciliation par session live ou par transaction.

---

### 4.f — Encaissement des paiements marchands

**Acteurs :** plateforme AfriWonder (compte marchand), vendeurs et prestataires  
**Objectif :** centraliser l'encaissement Mobile Money au profit de l'écosystème, puis redistribuer les parts dues.

**Fonctionnement cible :**

1. Les paiements utilisateurs sont **encaissés** sur le compte marchand / agrégateur de FBF GLOBAL (AfriWonder).
2. La plateforme enregistre virtuellement les parts créateurs, vendeurs et commission plateforme.
3. Les marchands et créateurs demandent le versement de leurs revenus enregistrés (manuellement aujourd'hui, automatiquement demain — section 6).

**Besoin agrégateur :** solution **Cash In / Paiement marchand** robuste, multi-opérateurs, reporting et conformité KYC/AML attendus par les équipes Juridique et Conformité d'InTouch.

---

### Synthèse des flux pour InTouch

| Cas d'usage | Type de flux agrégateur | Priorité |
|-------------|-------------------------|----------|
| Rechargement du compte utilisateur | Cash In / collecte | **Haute** |
| Marketplace | Paiement marchand | **Haute** |
| Services numériques | Paiement marchand | **Haute** |
| Dons / tips | Paiement marchand | **Haute** |
| Live / live commerce | Paiement marchand (micro-transactions) | **Haute** |
| Reversement créateurs/vendeurs | Cash Out / Payout | **Moyenne** (phase 2) |

---

## 5. Modèle de monétisation

Les revenus de la plateforme proviennent principalement de **commissions** appliquées à certaines transactions, de **services premium** et de **services à valeur ajoutée** proposés aux utilisateurs, créateurs et commerçants.

AfriWonder n'est pas une simple passerelle de paiement : c'est une **plateforme de marketplace et de médias** dont la viabilité repose sur le **volume d'activité** et la **diversification des revenus**, ce qui justifie un partenariat pérenne avec un agrégateur fiable et scalable.

---

## 6. Besoins de paiement

### 6.1 Besoin principal (phase 1 — priorité immédiate)

| Besoin | Description |
|--------|-------------|
| **Cash In** | Permettre aux utilisateurs d'alimenter leur **compte utilisateur via Mobile Money** ou de payer directement via Orange Money, Wave, Moov Money et autres opérateurs supportés par InTouch. |
| **Paiement marchand** | Encaisser les paiements marketplace, services, dons, lives et abonnements au nom de FBF GLOBAL / AfriWonder, avec retour de statut et référence de transaction. |
| **Multi-opérateurs** | Unifier les opérateurs via l'agrégateur pour simplifier l'intégration juridique et technique côté FBF GLOBAL. |
| **Conformité** | Traçabilité, rapprochement comptable, gestion des litiges et chargebacks selon les règles InTouch et la réglementation locale. |

### 6.2 Besoin futur (phase 2)

| Besoin | Description |
|--------|-------------|
| **Cash Out / Payout** | Reversement automatique des revenus des **créateurs** et **vendeurs** vers leurs comptes Mobile Money (retraits demandés depuis l'application). |
| **Fréquence** | Retraits manuels ou automatiques selon règles de conformité et délais de traitement convenus. |
| **Bénéfice partenariat** | Réduire les virements manuels internes et accélérer la confiance des créateurs dans la monétisation AfriWonder. |

### 6.3 Volumes et calendrier (indicatif)

Les volumes exacts seront communiqués dans le cadre du dossier KYC et du contrat commercial. La croissance est portée par l'application mobile Android déjà publiée et disponible sur Google Play, ainsi que par les campagnes d'acquisition créateurs / vendeurs au Mali, puis extension sous-régionale.

---

## 7. Conformité et sécurité

**FBF GLOBAL** s'engage à respecter les exigences réglementaires applicables en matière de **lutte contre la fraude**, de **protection des données personnelles** et de **traçabilité des transactions**.

La plateforme conserve les informations nécessaires à l'identification des opérations et met en œuvre des mécanismes de contrôle visant à garantir l'**intégrité des flux financiers**.

Les politiques publiques (confidentialité, conditions d'utilisation, suppression de compte) sont accessibles depuis la fiche application et le site associé à la plateforme.

---

## 8. Conclusion et perspectives de partenariat

AfriWonder est une super-application **déjà en production**. L'**application mobile Android** est **déjà publiée et disponible sur Google Play** ; elle constitue aujourd'hui le **principal canal d'utilisation** de la plateforme. Une version web complémentaire partage le même compte utilisateur et le même backend. L'écosystème de paiements et de monétisation est structuré autour du compte utilisateur et de l'historique des opérations, de la marketplace, des créateurs et du live.

Les **paiements Mobile Money** constituent un composant essentiel du **lancement commercial** de plusieurs fonctionnalités de la plateforme, notamment la **marketplace**, la **monétisation des créateurs de contenu**, les **dons**, les **abonnements** et les **événements diffusés en direct**.

**FBF GLOBAL** recherche un **partenaire stratégique de long terme** capable d'accompagner la croissance d'AfriWonder au **Mali**, puis dans d'autres marchés d'**Afrique de l'Ouest**.

**FBF GLOBAL** recherche également un **partenaire de paiement fiable** pour :

- intégrer de manière unifiée les solutions **Mobile Money** dans l'écosystème AfriWonder ;
- sécuriser l'**encaissement** des flux utilisateurs (Cash In et paiement marchand) ;
- préparer, avec InTouch, le déploiement des **reversements** (Cash Out) vers les créateurs et marchands ;
- accompagner la croissance avec un interlocuteur unique (Business, Juridique, Conformité, Intégration).

Nous sommes disponibles pour un échange approfondi sur le périmètre fonctionnel, le calendrier d'intégration et les documents réglementaires attendus (statuts, registre de commerce, politique de confidentialité, conditions générales d'utilisation).

### Intérêt du partenariat pour InTouch

Ce partenariat permettra à **InTouch** d'accompagner une plateforme numérique à **fort potentiel de croissance**, avec des flux de paiement issus du **commerce électronique**, de la **création de contenu**, du **live streaming** et des **services numériques**.

---

**Contact — FBF GLOBAL / AfriWonder**

| | |
|---|---|
| **Représentant légal** | Abdoulaye FANE |
| **Entreprise** | FANE BADADERE FANE GLOBAL (FBF GLOBAL) |
| **Téléphone** | +212 702 801 928 |
| **E-mail** | fanebadadrefane@gmail.com |
| **Support** | support@afriwonder.com |

---

*Document établi par FBF GLOBAL — usage confidentiel dans le cadre des discussions avec InTouch. Toute reproduction ou diffusion externe requiert l'accord préalable de FBF GLOBAL.*
