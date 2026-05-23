# Présentation AfriWonder — numérotation des slides (1 à 36)

Contenu oral et textes recopiés tels que fournis ; seuls les titres de slide sont numérotés et, pour atteindre 36 slides, les sections très longues « Architecture logique » et « Stack technologique » sont découpées en suites de slides sans modifier le texte.

---

## SLIDE 1 — Ce que tu peux dire oralement

Ce que tu peux dire oralement

“Bonjour à tous.

Aujourd’hui, j’ai l’honneur de vous présenter mon projet  intitulé AfriWonder Super-App. 
Ce projet s’inscrit dans une vision d’innovation numérique orientée vers les besoins du marché africain.

L’objectif principal était de concevoir une plateforme technologique capable de centraliser plusieurs services numériques au sein d’un même écosystème :

social,
commerce,
finance,
communication,
services locaux,
et plusieurs autres domaines.

À travers ce projet, j’ai cherché à combiner :

architecture logicielle,
expérience utilisateur,
sécurité,
scalabilité,
et gouvernance des systèmes d’information.

Durant cette présentation, je vais vous exposer :

le contexte du projet,
les choix techniques réalisés,
l’architecture mise en place,
ainsi que les défis rencontrés et les perspectives d’évolution.” 

---

## SLIDE 2 — 1. SOMMAIRE DE LA PRÉSENTATION

1. SOMMAIRE DE LA PRÉSENTATION
Ce que tu dis

“Avant d’entrer dans les aspects techniques, voici l’organisation générale de cette soutenance.

Dans une première partie, je vais présenter :

le contexte du projet,
les problématiques identifiées,
ainsi que les besoins fonctionnels de la plateforme.

Ensuite, je présenterai la structure technique du système :

l’architecture,
les technologies utilisées,
la base de données,
ainsi que les stratégies frontend et mobile.

Puis j’aborderai :

la sécurité,
le temps réel,
les paiements,
les performances,
et le déploiement DevOps.

Enfin, je terminerai par :

les défis techniques rencontrés,
les limites actuelles,
les perspectives d’évolution,
et le bilan global du projet.” 

---

## SLIDE 3 — 2. INTRODUCTION AU PROJET AFRIWONDER

2. INTRODUCTION AU PROJET AFRIWONDER
Ce que tu dis

“AfriWonder est né d’un constat important :
les services numériques en Afrique sont fortement fragmentés.

Aujourd’hui, un utilisateur doit souvent utiliser plusieurs applications différentes pour :

communiquer,
acheter,
effectuer des paiements,
accéder à des services locaux,
ou consommer du contenu.

L’objectif du projet était donc de concevoir une super-app capable de centraliser plusieurs services dans une seule plateforme cohérente.

La vision d’AfriWonder repose sur :

l’intégration du social,
du commerce,
de la finance,
et des services numériques.

La plateforme vise également :

une meilleure accessibilité,
la monétisation locale,
et une expérience utilisateur unifiée.” 

---

## SLIDE 4 — 3. PROBLÉMATIQUE ET ENJEUX STRATÉGIQUES

3. PROBLÉMATIQUE ET ENJEUX STRATÉGIQUES
Ce que tu dis

“Le développement d’une super-app africaine présente plusieurs défis stratégiques et techniques.

Premièrement :
le marché numérique africain reste très fragmenté avec des solutions souvent isolées les unes des autres.

Deuxièmement :
L’accès aux systèmes de paiement internationaux reste limité dans plusieurs régions.

Nous devons également prendre en compte :

les contraintes réseau,
la faible stabilité de certaines connexions,
ainsi que les performances limitées de nombreux appareils mobiles.

Enfin, dans une logique MGSI, il était essentiel de mettre en place :

une gouvernance centralisée des données,
ainsi qu’une sécurisation forte des informations utilisateurs.”  

---

## SLIDE 5 — 4. ANALYSE DES BESOINS FONCTIONNELS

4. ANALYSE DES BESOINS FONCTIONNELS
Ce que tu dis

“Après l’analyse du contexte, nous avons identifié plusieurs besoins fonctionnels majeurs.

La plateforme intègre d’abord des modules principaux comme :

le feed vidéo,
la marketplace,
et la messagerie temps réel.

Nous avons également intégré des services orientés inclusion économique :

wallet financier,
paiements sécurisés,
transport,
santé,
et systèmes de tontines.

Enfin, la plateforme devait supporter plusieurs profils utilisateurs :

créateurs,
vendeurs,
prestataires,
et administrateurs.

Des fonctionnalités transversales comme :

la traduction,
les chatbots IA,
et les notifications push,
ont aussi été intégrées.”  

---

## SLIDE 6 — 5. CARTOGRAPHIE DES CAS D’UTILISATION

5. CARTOGRAPHIE DES CAS D’UTILISATION
Ce que tu dis

“Cette slide présente les principaux cas d’utilisation de la plateforme.

Sur le plan social,
les utilisateurs peuvent :

publier du contenu vidéo,
interagir avec les stories,
et échanger en temps réel.

Concernant le marketplace,
la plateforme gère tout le cycle de vente :

publication produit,
commande,
paiement,
et validation.

Le wallet permet :

la gestion des soldes,
les transactions,
et les paiements sécurisés.

Enfin, un système d’administration centralisé permet :

la modération,
le pilotage,
et la supervision globale de l’écosystème.” 

---

## SLIDE 7 — 6. ARCHITECTURE LOGIQUE DU SYSTÈME (1/4) — Modèle client-serveur et définition d’API

6. ARCHITECTURE LOGIQUE DU SYSTÈME
Ce que tu dis

“L’architecture d’AfriWonder repose sur un modèle client-serveur distribué.

La plateforme connecte :

la PWA,
les applications mobiles,
et le backend centralisé via des API REST sécurisées. API REST” signifie :

API = Application Programming Interface

Une API est un mécanisme qui permet à deux applications de communiquer entre elles.

Exemple simple dans ton projet :

le frontend React envoie une demande,
le backend Node.js répond avec des données.

Donc l’API sert d’intermédiaire entre :

l’interface utilisateur,
et le serveur/backend.

---

## SLIDE 8 — 6. ARCHITECTURE LOGIQUE DU SYSTÈME (2/4) — REST et exemple AfriWonder

REST = Representational State Transfer

REST est un style d’architecture utilisé pour construire des APIs web.

Une API REST fonctionne principalement avec :

HTTP,
des URLs,
et des méthodes standard comme :
GET
POST
PUT
DELETE
Exemple concret dans AfriWonder

Quand un utilisateur ouvre le feed vidéo :

Le frontend envoie une requête :

GET /api/videos

Le backend répond :

[
  {
    "id": 1,
    "title": "Vidéo AfriWonder"
  }
]

Donc :

React demande les vidéos,
l’API REST transmet la demande,
Node.js traite,
PostgreSQL fournit les données,
puis l’API renvoie la réponse.

---

## SLIDE 9 — 6. ARCHITECTURE LOGIQUE DU SYSTÈME (3/4) — Méthodes REST et intérêt

Les principales méthodes REST
GET

Récupérer des données

Exemple :

GET /users

→ récupérer les utilisateurs

POST

Créer des données

Exemple :

POST /products

→ créer un produit

PUT

Modifier complètement une donnée

Exemple :

PUT /users/5

→ modifier utilisateur 5

DELETE

Supprimer une donnée

Exemple :

DELETE /products/2

→ supprimer produit 2

Pourquoi REST est utilisé ?

REST est populaire parce que :

simple,
standard,
scalable,
compatible web/mobile,
facile à maintenir.

---

## SLIDE 10 — 6. ARCHITECTURE LOGIQUE DU SYSTÈME (4/4) — Oral API REST, WebSockets et couches

Ce que tu peux dire à l’oral

“Une API REST est une interface de communication entre le frontend et le backend.

Elle permet aux applications d’échanger des données via HTTP grâce à des routes standardisées comme GET, POST, PUT et DELETE.

Dans AfriWonder, l’API REST est utilisée pour gérer :

les utilisateurs,
les vidéos,
les paiements,
les messages,
et l’ensemble des modules de la plateforme.”

Pour les échanges temps réel,
nous utilisons également des WebSockets.

Le backend est organisé de manière modulaire afin d’isoler les différents domaines métier comme :

la vidéo,
le commerce,
ou le wallet.

Enfin, l’architecture suit une séparation en couches :

routes,
services,
et accès aux données.”

---

## SLIDE 11 — 7. STACK TECHNOLOGIQUE (1/5) — Choix et socle

7. STACK TECHNOLOGIQUE
Ce que tu dis

“Le choix technologique a été guidé par :

la performance,
la maintenabilité,
et la scalabilité.

Nous avons choisi TypeScript comme langage unique afin d’unifier le frontend et le backend.

Le backend repose sur Node.js et Express pour construire une API REST légère et performante.

Pour le frontend web,
nous utilisons React 18 avec Vite afin d’obtenir des temps de build très rapides.

Enfin, la partie mobile est développée avec React Native et Expo afin de cibler Android et iOS avec une seule base de code.” 

---

## SLIDE 12 — 7. STACK TECHNOLOGIQUE (2/5) — Oral synthèse TypeScript

CE QUE TU DIS À L’ORAL

“Pour développer AfriWonder, j’ai choisi une stack moderne entièrement basée sur TypeScript afin d’unifier le frontend et le backend avec un même langage.” 

---

## SLIDE 13 — 7. STACK TECHNOLOGIQUE (3/5) — DTO

DTO = Data Transfer Object

Un DTO est un objet utilisé pour transporter des données entre différentes parties d’une application.

Par exemple :

entre le frontend et le backend,
entre l’API et la base de données,
ou entre deux services backend.
Pourquoi utiliser des DTO ?

Les DTO servent à :

structurer les données,
contrôler ce qui est envoyé,
éviter d’exposer des données sensibles,
standardiser les échanges,
améliorer la maintenabilité.
Exemple simple dans AfriWonder

Supposons qu’un utilisateur s’inscrit.

Le frontend envoie :

{
  "name": "Abdoulaye",
  "email": "test@gmail.com",
  "password": "123456"
}

Tu peux créer un DTO :

type RegisterUserDTO = {
  name: string
  email: string
  password: string
}

Ce DTO définit exactement :

les champs autorisés,
leur type,
et leur structure.
Pourquoi c’est important ?

Sans DTO :

les données deviennent désorganisées,
risque d’erreurs,
risque de sécurité,
incohérences frontend/backend.

Avec DTO :

tout est standardisé,
typé,
sécurisé,
prévisible.
“Types” en TypeScript

En TypeScript, un “type” sert à définir la forme d’une donnée.

Exemple :

type User = {
  id: number
  username: string
  email: string
}

Ici :

id doit être un nombre,
username une chaîne,
email une chaîne.
Différence simple
Type

Définit la structure d’une donnée.

DTO

Utilise souvent des types pour transporter des données entre couches.

Donc :

un DTO est souvent un type spécialisé pour les échanges de données.

Pourquoi c’est utile dans ton projet ?

Dans AfriWonder :

frontend,
backend,
mobile,
API,
Prisma,
WebSockets

échangent énormément de données.

Les DTO permettent :

cohérence,
sécurité,
réutilisation,
partage des types entre frontend et backend.
Ce que tu peux dire à l’oral

“DTO signifie Data Transfer Object.

C’est une structure utilisée pour transporter des données entre différentes couches de l’application, notamment entre le frontend et le backend.

Les DTO permettent de standardiser les échanges de données, améliorer la sécurité et garantir la cohérence des informations.

Dans AfriWonder, TypeScript et les DTO facilitent le partage des types entre les applications web, mobile et le backend.”

---

## SLIDE 14 — 7. STACK TECHNOLOGIQUE (4/5) — TypeScript à Redis

TypeScript

“TypeScript est une extension de JavaScript qui ajoute le typage fort.
Cela permet de détecter les erreurs avant l’exécution et d’améliorer la maintenabilité du projet.”

Pourquoi utilisé ?

“Comme AfriWonder contient beaucoup de modules et de données complexes, TypeScript permet d’éviter les incohérences entre frontend et backend.”

Node.js

“Node.js est un environnement d’exécution JavaScript côté serveur.
Il permet de créer des APIs performantes et capables de gérer beaucoup de connexions simultanées.”

Pourquoi utilisé ?

“Il est particulièrement adapté aux applications temps réel comme la messagerie et les notifications.”

Express

“Express est un framework Node.js léger permettant de construire rapidement des APIs REST.”

Pourquoi utilisé ?

“Il facilite l’organisation des routes, des middlewares et des services backend.”

React

“React est une bibliothèque frontend permettant de créer des interfaces dynamiques basées sur des composants réutilisables.”

Pourquoi utilisé ?

“Cela améliore la modularité et la réutilisation de l’interface utilisateur.”

Vite

“Vite est un outil de build moderne très rapide.”

Pourquoi utilisé ?

“Il réduit fortement le temps de compilation et améliore l’expérience développeur.”

Expo / React Native

“Expo est un framework basé sur React Native permettant de développer des applications mobiles Android et iOS avec une seule base de code.”

Pourquoi utilisé ?

“Cela réduit le temps de développement mobile tout en gardant une expérience native.”

PostgreSQL

“PostgreSQL est une base de données relationnelle robuste.”

Pourquoi utilisé ?

“AfriWonder contient beaucoup de relations complexes entre utilisateurs, paiements, commandes et interactions sociales.”

Prisma ORM

“Prisma est un ORM, c’est-à-dire un outil qui simplifie les interactions entre le backend et la base de données.”

Pourquoi utilisé ?

“Il facilite les requêtes SQL, les relations et le typage automatique des données.”

Redis

“Redis est une base de données en mémoire utilisée principalement comme système de cache.”

Pourquoi utilisé ?

“Il améliore les performances et permet la gestion temps réel multi-instance.”

---

## SLIDE 15 — 7. STACK TECHNOLOGIQUE (5/5) — Socket.IO à GitHub Actions

Socket.IO

“Socket.IO est une technologie WebSocket permettant des communications bidirectionnelles en temps réel.”

Pourquoi utilisé ?

“Il est utilisé pour la messagerie instantanée et les notifications.”

Docker

“Docker permet de conteneuriser les services.”

Pourquoi utilisé ?

“Cela garantit que l’application fonctionne de manière identique sur tous les environnements.”

Nginx

“Nginx est un serveur web et reverse proxy.”

Pourquoi utilisé ?

“Il permet la sécurisation HTTPS, le routage des requêtes et l’équilibrage de charge.”

Tailwind CSS

“Tailwind est un framework CSS utilitaire.”

Pourquoi utilisé ?

“Il accélère la création d’interfaces modernes et cohérentes.”

Jest / Vitest

“Jest et Vitest sont des frameworks de tests.”

Pourquoi utilisés ?

“Ils permettent de tester automatiquement les fonctionnalités critiques.”

GitHub Actions

“GitHub Actions est un système CI/CD.”

Définition CI/CD

“CI/CD signifie Intégration Continue et Déploiement Continu.”

Pourquoi utilisé ?

“Pour automatiser les tests, validations et déploiements.” 

---

## SLIDE 16 — 8. ARCHITECTURE BACKEND ET API (1/3) — Synthèse et Zod

8. ARCHITECTURE BACKEND ET API: 
Backend organisé par domaines métier : chaque module a ses routes, ses services et sa logique dédiée.
Toutes les entrées passent par Zod pour garantir l’intégrité des données.
Sécurité multi-couches : JWT + Refresh Token, Helmet, CORS, Rate Limiting.
Protection contre attaques courantes : XSS, CSRF, SQL Injection, SSRF (proxy sécurisé). 
Zod est une bibliothèque TypeScript/JavaScript de validation de données.

Elle sert à définir un schéma (la forme attendue d’une donnée).
Ensuite, elle vérifie que les données reçues (API, formulaires, query params) respectent ce schéma.
Si c’est valide, tu obtiens des données propres et typées.
Si ce n’est pas valide, elle renvoie des erreurs claires.
Exemple simple : voir le slide import etc..  
Dans mon backend AfriWonder, Zod est utile pour sécuriser les entrées API avant la logique métier et la base de données.
. Secrets hors code grâce aux variables .env. 
Pipeline média avec Multer (upload) + Sharp (optimisation) pour de meilleures performances. 

---

## SLIDE 17 — 8. ARCHITECTURE BACKEND ET API (2/3) — Ce que tu dis (middlewares, risques, proxy, .env, médias)

Ce que tu dis

“Le backend suit une architecture organisée par domaines métier.

Chaque module possède :

ses routes,
ses services,
et sa logique métier dédiée.

Les données entrantes sont validées avec Zod afin de garantir leur intégrité.

Plusieurs middlewares de sécurité ont été intégrés :

JWT, (JWT

“JWT signifie JSON Web Token.”

Définition

“C’est un token sécurisé utilisé pour authentifier les utilisateurs.”

Pourquoi utilisé ?

“Il permet aux utilisateurs de rester connectés sans stocker la session côté serveur.”)
. Helmet,: (Helmet

“Helmet est un middleware Express de sécurité.”

Pourquoi utilisé ?

“Il ajoute automatiquement des protections HTTP contre plusieurs attaques web.”) .CORS,:
et 
Rate Limiting.: (Rate Limiting

“Le Rate Limiting limite le nombre de requêtes envoyées par un utilisateur.”

Pourquoi ?

“Cela protège contre les abus et les attaques de type brute force.”) 

Refresh Token:

“Le Refresh Token permet de renouveler automatiquement un JWT expiré.”

Pourquoi ?

“Cela améliore la sécurité sans obliger l’utilisateur à se reconnecter constamment.”

XSS:

“XSS signifie Cross-Site Scripting.”

Définition

“C’est une attaque où un pirate injecte du code JavaScript malveillant dans une page web.”

Protection:

“Helmet et la validation des entrées permettent de limiter ce risque.”

CSRF:

“CSRF signifie Cross-Site Request Forgery.”

Définition

“C’est une attaque où un utilisateur authentifié exécute une action non voulue à travers un site malveillant.”

Protection:

“Les tokens sécurisés et la validation des requêtes empêchent ce type d’attaque.”

SQL Injection:

“Une injection SQL consiste à injecter des requêtes SQL malveillantes.”

Protection:

“Prisma ORM protège automatiquement les requêtes grâce au typage et aux requêtes paramétrées.” 
Proxy sécurisé:

“Le proxy média sécurisé agit comme intermédiaire entre les médias externes et l’utilisateur.”

Pourquoi ?

“Cela évite certaines attaques comme les SSRF.”  

Variables .env:

“Les fichiers .env permettent de stocker les secrets de l’application.”

Pourquoi ?

“Les clés API et mots de passe ne doivent jamais être visibles dans le code source.”Enfin, les médias sont traités avec Multer et Sharp afin d’optimiser :

les uploads,
les images,
et les performances globales.”  

---

## SLIDE 18 — 8. ARCHITECTURE BACKEND ET API (3/3) — Architecture Backend et API (oral slide)

Architecture Backend et API:

“Cette slide présente l’organisation interne du backend AfriWonder.

Le backend repose sur Node.js et Express avec une architecture organisée par domaines métier.

Chaque module possède :

ses routes,
ses services,
et sa logique métier dédiée.

Cette approche facilite :

la maintenance,
l’évolutivité,
et l’isolation des fonctionnalités.

La validation des données est assurée avec Zod afin de garantir la fiabilité des informations reçues par l’API.

Plusieurs middlewares de sécurité ont également été intégrés :

JWT pour l’authentification,
Helmet pour la protection HTTP,
CORS,
ainsi qu’un système de Rate Limiting contre les abus.

Enfin, le traitement des médias est optimisé avec Multer et Sharp afin de réduire la taille des fichiers et améliorer les performances globales.” 


---

## SLIDE 19 — Modélisation des Données avec Prisma

Modélisation des Données avec Prisma

“Pour la couche d’accès aux données, nous avons choisi Prisma ORM avec PostgreSQL.

Prisma offre plusieurs avantages importants :

un typage fort,
des migrations automatisées,
et une meilleure productivité de développement.

Le schéma relationnel contient plus de 100 modèles afin de couvrir les différents domaines métier de la super-app.

Prisma facilite également :

la cohérence des relations,
l’intégrité des données,
et l’optimisation des requêtes.

Cette approche améliore la maintenabilité globale du backend.” 
AfriWonder utilise Prisma ORM + PostgreSQL pour la couche d’accès aux données.
Le schéma Prisma centralise plus de 100 modèles relationnels couvrant les domaines métier de la super-app.
Prisma apporte un typage fort, des migrations automatisées, et une meilleure productivité.
Cette approche garantit la cohérence des relations, l’intégrité des données et l’optimisation des requêtes.
Résultat : un backend plus maintenable, fiable et plus simple à faire évoluer. 


---

## SLIDE 20 — Structure du Schéma de Base de Données

Structure du Schéma de Base de Données

“Cette slide présente la structure logique principale de la base de données.

L’entité User constitue le hub central du système.

Elle est reliée :

aux vidéos,
au wallet,
aux commandes,
aux interactions sociales,
et aux différents services de la plateforme.

Le module marketplace gère :

les produits,
les catégories,
les stocks,
et les commandes.

Le système financier repose sur :

les transactions,
les soldes,
et l’historique des opérations.

Enfin, la partie sociale gère :

les abonnements,
les commentaires,
les likes,
et les stories.” 

---

## SLIDE 21 — Stratégie Frontend : PWA vs Mobile Natif

Stratégie Frontend : PWA vs Mobile Natif

“Pour maximiser l’accessibilité de la plateforme, nous avons adopté une double stratégie frontend.

La première approche repose sur une Progressive Web App développée avec React et Vite.

Cette solution permet :

un accès rapide via navigateur,
un bon référencement,
et un déploiement instantané sans passer par les stores.

En parallèle, une application mobile native a été développée avec React Native et Expo.

Cette application offre :

une meilleure intégration matérielle,
l’accès à la caméra,
les notifications push,
et un mode hors ligne.

Les deux clients partagent :

une partie de la logique métier,
les types TypeScript,
et un Design System unifié basé sur Tailwind CSS.” 
Les deux clients s’appuient sur un socle commun : logique métier, types TypeScript et design system unifié.
La couche d’état et de data fetching assure une expérience fluide, performante et résiliente au réseau. 

---

## SLIDE 22 — Gestion de l'État et Récupération des Données

Gestion de l'État et Récupération des Données 
“La gestion des données côté frontend repose principalement sur TanStack Query et Zustand.

TanStack Query est utilisé pour :

la récupération des données serveur,
le cache,
et la synchronisation automatique.

Zustand permet une gestion légère de l’état global comme :

l’authentification,
le thème,
ou certaines préférences utilisateur.

Nous avons également intégré :

la persistance locale,
ainsi qu’une stratégie Optimistic UI.

Cela permet par exemple d’afficher immédiatement :

un like,
ou un commentaire,
avant même la confirmation complète du serveur.

L’objectif est d’améliorer la fluidité perçue par l’utilisateur.” 
schéma: Le frontend combine TanStack Query (données serveur, cache, sync) et Zustand (état global léger).
TanStack Query gère la récupération des données, le cache et la mise à jour automatique.
Zustand centralise l’état global : auth, thème, préférences.
Avec la persistance locale et l’Optimistic UI, certaines actions (like/commentaire) s’affichent immédiatement avant la réponse serveur. 
Résultat : une application perçue comme plus rapide et plus fluide. 


---

## SLIDE 23 — Communication en Temps Réel

Communication en Temps Réel:

“Les fonctionnalités temps réel sont basées sur Socket.IO.

Cette technologie permet :

la messagerie instantanée,
la gestion de présence,
les notifications,
et les échanges bidirectionnels en temps réel.

La plateforme supporte :

les discussions privées,
les groupes,
ainsi que les notifications sociales et commerciales.

Pour assurer la scalabilité,
un adaptateur Redis est utilisé afin de synchroniser plusieurs instances backend.” 


---

## SLIDE 24 — Intégration des Services de Paiement

Intégration des Services de Paiement: 

“La plateforme intègre plusieurs solutions de paiement adaptées aux contextes locaux et internationaux.

Nous utilisons notamment :

Stripe,
ainsi que des solutions Mobile Money comme Orange Money.

Les transactions sont sécurisées grâce à des webhooks dédiés permettant :

la validation,
la confirmation,
et la synchronisation des paiements.

Le workflow financier suit plusieurs étapes :

initialisation,
confirmation,
puis mise à jour du wallet.

Cela garantit :

la traçabilité,
la cohérence,
et la sécurité des opérations financières.” 

---

## SLIDE 25 — Explication de l’illustration paiement / Webhooks

Explication de l’illustration paiement:  
Le schéma montre le cycle complet d’un paiement dans AfriWonder :

Initialisation
L’utilisateur lance un paiement depuis l’app.
Le backend crée une transaction “en attente” et envoie la demande vers Stripe ou Mobile Money.

Passerelle de paiement
Le provider (Stripe / Orange Money) traite réellement le paiement (carte, compte mobile money, etc.).

Webhook (point clé)
Quand le paiement change d’état, le provider envoie automatiquement une requête HTTP à ton backend : c’est le webhook.

Validation / Confirmation
Le backend vérifie que l’événement est authentique (signature), puis confirme le statut (success, failed, etc.).

Mise à jour wallet + historique
Si paiement validé, le solde wallet est mis à jour et l’opération est enregistrée (traçabilité).

C’est quoi un webhook ?
Un webhook est une notification serveur-à-serveur en temps réel.

Au lieu de demander toutes les 5 secondes “paiement fini ?”
Le provider te préviens automatiquement dès qu’il a un résultat.
C’est donc un mécanisme de “push” d’événements.

À quoi ça sert dans ton cas ?
Fiabilité : tu te bases sur la confirmation officielle du provider.
Synchronisation : wallet et statut commande restent alignés avec la vraie transaction.
Temps réel : mise à jour rapide côté utilisateur.
Sécurité : vérification de signature + contrôles anti-fraude côté backend.
Pourquoi c’est indispensable en paiement ?
Sans webhook, tu risques :

des paiements “réussis” côté provider mais non reflétés dans ton app,
des soldes incohérents,
des erreurs si l’utilisateur ferme l’app avant la fin.
Le webhook évite ces désynchronisations.

Bonnes pratiques webhook (important)
Vérifier la signature de l’événement.
Utiliser l’idempotence (si le même événement arrive 2 fois, ne pas créditer 2 fois).
Journaliser chaque événement (audit).
Mettre à jour l’état via une machine d’états claire : pending -> confirmed/failed.  

---

## SLIDE 26 — Services de Traduction et Intelligence Artificielle

Services de Traduction et Intelligence Artificielle: 

“Afin d’améliorer l’accessibilité de la plateforme,
plusieurs services de traduction et d’intelligence artificielle ont été intégrés.

Nous utilisons :

LibreTranslate,
ainsi que MyMemory pour le support multilingue.

Ces services permettent :

la traduction automatique,
et une meilleure accessibilité linguistique.

Un système de chatbot a également été intégré pour l’assistance automatisée.

Enfin, un pipeline Speech-to-Text est prévu pour :

la génération de sous-titres,
et le traitement automatique des contenus vidéo.

Des mécanismes de modération automatique permettent également de filtrer certains contenus sensibles.”

---

## SLIDE 27 — Sécurité du système d'information (version orale et explication)

Sécurité  du système  d'information:  
Cette slide présente la stratégie de sécurité du système d’information d’AfriWonder.
Nous avons mis en place une authentification basée sur JWT avec un mécanisme Access et Refresh Token pour sécuriser les sessions utilisateurs.
Ensuite, nous protégeons l’application contre les principales menaces web : XSS, CSRF et injections SQL, notamment grâce à la validation stricte des données et à Prisma ORM.
Nous utilisons aussi un proxy média sécurisé pour contrôler les ressources externes.
Enfin, les secrets techniques sont isolés dans des variables d’environnement .env, ce qui renforce la confidentialité globale de l’infrastructure. »
Explication simple de l’illustration
Ce schéma montre la chaîne de sécurité de ton backend, de l’entrée utilisateur jusqu’à la protection des données.

Authentification & accès
Sert à vérifier l’identité avec JWT et à garder une session sécurisée avec Refresh Token.

Validation des entrées (Zod)
Sert à bloquer les données invalides ou malveillantes avant la logique métier.

Protections applicatives

XSS : évite l’injection de scripts dans les pages.
CSRF : empêche des actions forcées depuis un site tiers.
SQL Injection : Prisma réduit ce risque via requêtes typées/paramétrées.
Proxy média sécurisé : agit comme intermédiaire pour limiter des attaques comme SSRF.
Gestion des secrets (.env)
Sert à ne jamais exposer mots de passe, tokens, clés API dans le code source.

Il sert à quoi, globalement ?
Cette architecture sert à :

protéger les comptes utilisateurs,
sécuriser les transactions et données sensibles,
éviter les attaques web les plus courantes,
et maintenir la conformité sécurité d’une super-app à grande échelle. 

---

## SLIDE 28 — Sécurité du Système d’Information

Sécurité du Système d’Information

“La sécurité constitue un axe majeur du projet AfriWonder.

L’authentification repose sur un système JWT avec Access Tokens et Refresh Tokens.

Plusieurs protections applicatives ont été intégrées contre :

les attaques XSS,
les attaques CSRF,
et les injections SQL.

Prisma contribue également à renforcer la sécurité des accès base de données.

Un proxy média sécurisé avec liste blanche permet de limiter les risques liés aux contenus externes.

Enfin, les variables sensibles sont isolées dans des fichiers d’environnement afin de protéger les secrets de l’infrastructure.” 


---

## SLIDE 29 — Performance et Optimisations Techniques

Performance et Optimisations Techniques:

“Plusieurs optimisations ont été mises en place afin d’améliorer les performances globales de la plateforme.

Côté frontend :
nous utilisons :

le Code Splitting,
le Lazy Loading,
ainsi que l’optimisation des images.

Le streaming vidéo est également découpé par fragments afin d’améliorer la fluidité sur réseaux instables.

Côté backend :
la compression Brotli et Redis réduisent les temps de réponse.

Enfin, le monitoring applicatif repose sur :

Sentry,
et Prometheus pour la surveillance des performances.”  

Explication de l’illustration (ce que ça fait, à quoi ça sert)
Le schéma montre que la performance repose sur 3 piliers complémentaires :

Frontend : charger moins, plus intelligemment, et au bon moment.
Backend : répondre plus vite grâce à la compression et au cache.
Monitoring : mesurer en continu pour détecter les régressions.
Détail par bloc
Code Splitting
Découpe le JavaScript en morceaux. L’utilisateur ne télécharge que ce dont il a besoin.
➜ Sert à réduire le temps de chargement initial.

Lazy Loading
Charge certains composants/pages uniquement quand ils deviennent nécessaires.
➜ Sert à accélérer l’affichage au démarrage.

Optimisation des images
Compression + formats/tailles adaptés.
➜ Sert à économiser la data mobile et accélérer l’UI.

Streaming vidéo par fragments
La vidéo est servie en petits segments.
➜ Sert à éviter les coupures sur réseau instable (contexte Afrique/Mali).

Brotli (backend)
Compresse les réponses HTTP.
➜ Sert à réduire la taille des payloads et le temps de transfert.

Redis (backend)
Met en cache des données fréquentes.
➜ Sert à réduire la charge DB et améliorer la latence API.

Sentry + Prometheus
Sentry capte les erreurs applicatives, Prometheus suit les métriques de perf.
➜ Sert à surveiller, alerter et corriger rapidement avant impact utilisateur.

Version orale (40 secondes)
« Cette slide présente notre stratégie d’optimisation technique.
Côté frontend, nous utilisons le code splitting, le lazy loading et l’optimisation des images pour réduire le temps de chargement.
Pour la vidéo, le streaming par fragments améliore la fluidité sur les réseaux instables.
Côté backend, Brotli réduit la taille des réponses HTTP et Redis accélère les accès fréquents via le cache.
Enfin, nous monitorons la plateforme avec Sentry pour les erreurs et Prometheus pour les métriques de performance.
L’objectif est d’assurer une expérience rapide, stable et mesurable en continu. » 


---

## SLIDE 30 — Stratégie DevOps et Déploiement

Stratégie DevOps et Déploiement: 

“Le déploiement de la plateforme repose sur une approche DevOps conteneurisée.

L’infrastructure utilise Docker Compose afin de simplifier :

le déploiement,
l’isolation des services,
et la reproductibilité des environnements.

Le backend est déployé avec plusieurs réplicas afin d’assurer :

la haute disponibilité,
et la tolérance aux pannes.

Nginx joue le rôle de Reverse Proxy et Certbot assure le chiffrement TLS.

Enfin, PostgreSQL et Redis assurent respectivement :

la persistance,
et les performances temps réel.” 
Explication de l’illustration (à quoi ça sert)
Ce schéma montre comment la plateforme est exploitée en production avec une approche conteneurisée.

Docker Compose pilote tous les services
➜ Sert à lancer l’environnement complet facilement, de manière reproductible.

Backends en plusieurs réplicas
➜ Sert à éviter le point unique de panne : si un replica tombe, les autres continuent.

Nginx en reverse proxy
➜ Sert à recevoir le trafic, router les requêtes vers les replicas backend, et centraliser l’entrée.

Certbot + TLS
➜ Sert à chiffrer les échanges en HTTPS (confidentialité + sécurité transport).

PostgreSQL
➜ Sert à la persistance durable des données métier.

Redis
➜ Sert au cache et aux usages temps réel pour améliorer les performances.

Version orale (45 secondes)
« Cette slide présente notre stratégie DevOps de déploiement.
Nous utilisons Docker Compose pour conteneuriser les services, ce qui simplifie le déploiement et garantit des environnements reproductibles.
Le backend est déployé avec plusieurs réplicas pour assurer la haute disponibilité et la tolérance aux pannes.
En entrée, Nginx joue le rôle de reverse proxy et distribue les requêtes, tandis que Certbot gère les certificats TLS pour le chiffrement HTTPS.
Enfin, PostgreSQL assure la persistance des données et Redis optimise les performances, notamment pour les accès rapides et les usages temps réel. » 

---

## SLIDE 31 — Schéma « incident » — panne d’un replica backend

Schéma “incident” — si un replica backend tombe:
Explication orale (30–40 secondes)
« Ici, on simule une panne d’un replica backend.
Le healthcheck détecte automatiquement que l’instance ne répond plus, puis Nginx la retire du pool de routage.
Le trafic est immédiatement redirigé vers les autres replicas encore sains.
Résultat : la plateforme continue de fonctionner avec une dégradation limitée, sans interruption globale du service.
Cette architecture améliore fortement la résilience et la disponibilité en production. »

Punchline jury (10 secondes)
« Une panne serveur n’arrête pas la plateforme : elle est absorbée automatiquement par les autres replicas. » 

---

## SLIDE 32 — Automatisation et Qualité du Code (CI/CD)

Automatisation et Qualité du Code (CI/CD):

“Afin d’assurer la qualité du projet,
un pipeline CI/CD a été mis en place avec GitHub Actions.

Chaque modification déclenche automatiquement :

les tests,
le lint,
le typecheck,
et les validations de qualité.

Les tests unitaires et d’intégration sont réalisés avec Jest et Vitest.

Une gouvernance stricte limite également la taille des Pull Requests afin de faciliter les revues de code et la maintenabilité.” 
En une phrase pour le jury
« Le CI/CD automatise les contrôles à chaque changement, bloque les régressions tôt, et la politique de petites PR rend les revues efficaces. »

Version orale (~40 s)
« Pour garantir la qualité du code, nous avons mis en place un pipeline CI/CD avec GitHub Actions.
À chaque modification, le pipeline exécute automatiquement le lint, le typecheck et les validations de qualité du projet.
Les tests unitaires et d’intégration passent par Jest côté backend et Vitest côté applications frontend.
En parallèle, une gouvernance stricte limite la taille des pull requests, ce qui facilite les revues de code et améliore la maintenabilité.
L’objectif est simple : détecter les erreurs le plus tôt possible et livrer un code plus fiable. » 

---

## SLIDE 33 — Défis Techniques et Solutions Apportées

Défis Techniques et Solutions Apportées

“Plusieurs défis techniques ont été rencontrés durant le développement.

Premièrement :
la complexité du schéma Prisma a nécessité une forte modularisation.

Deuxièmement :
la lecture vidéo devait rester fluide malgré des réseaux instables.

Des mécanismes adaptatifs ont donc été mis en place.

Nous avons également dû gérer :

la synchronisation JWT entre mobile et PWA,
ainsi que la sécurisation du proxy média contre les failles SSRF.”

---

## SLIDE 34 — Limites Actuelles du Projet

Limites Actuelles du Projet

“Malgré les fonctionnalités développées,
certaines limites subsistent actuellement.

L’architecture reste principalement monolithique,
ce qui peut poser des défis de scalabilité à très grande échelle.

Certaines fonctionnalités avancées de Speech-to-Text sont encore en cours d’intégration.

Enfin, la taille importante du schéma base de données complexifie parfois l’onboarding de nouveaux développeurs.”

---

## SLIDE 35 — Améliorations Futures et Évolutions

Améliorations Futures et Évolutions

“Plusieurs améliorations sont prévues pour les prochaines évolutions du projet.

Une transition progressive vers une architecture microservices est envisagée pour certains domaines critiques.

Des tests de charge plus avancés seront également réalisés afin d’améliorer la montée en charge.

Les fonctionnalités IA natives liées au NLP et au Speech-to-Text seront finalisées.

Enfin, un système de Feature Flags permettra un déploiement progressif et plus sécurisé des nouvelles fonctionnalités.”

---

## SLIDE 36 — Compétences Acquises, Conclusion Générale et Session Questions / Réponses

Compétences Acquises et Bilan Personnel

“Ce projet m’a permis de renforcer plusieurs compétences techniques et organisationnelles.

J’ai pu travailler sur :

le développement Full-Stack,
l’architecture logicielle,
la sécurité,
le DevOps,
et la gouvernance des systèmes d’information.

Ce projet m’a également permis d’améliorer :

la gestion de projet,
la qualité logicielle,
et la conception de systèmes complexes et scalables.”
Conclusion Générale

“Pour conclure,
AfriWonder représente une réponse technologique concrète aux besoins numériques du marché africain.

Ce projet combine :

innovation,
architecture logicielle,
sécurité,
et gouvernance des systèmes d’information.

Il constitue également une application concrète des compétences acquises durant la formation MGSI à l’ENSAK.

À terme,
l’objectif est de faire évoluer cette plateforme vers une super-app industrialisable et prête pour un déploiement à grande échelle.”

Session Questions / Réponses

“Je vous remercie pour votre attention.

Je suis maintenant disponible pour répondre à vos questions.”

---

## Note sur la numérotation

Pour obtenir **exactement 36 slides**, les sections **6. Architecture logique** et **7. Stack technologique** ont été réparties en **4 + 5 slides** (slides 7 à 15) sans modifier le texte, seulement en le regroupant par blocs consécutifs. Les titres **1. SOMMAIRE** à **8. ARCHITECTURE BACKEND** du document d’origine sont conservés tels quels dans le corps des slides 2, 3, … 18.
