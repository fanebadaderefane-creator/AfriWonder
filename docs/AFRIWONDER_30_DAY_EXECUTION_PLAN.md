# AfriWonder — Plan d'execution 30 jours (produit + business)

Objectif: livrer chaque jour une preuve concrete.  
Regle: aucune tache > 24h. Chaque item ci-dessous doit se conclure par code + test + preuve UI/API.

## Priorites produit (ordre strict)

1. Messagerie + argent (core)
2. Paiement reel
3. Marketplace sociale
4. Upload media robuste
5. Mode low-data
6. Scaling

## Semaine 1 (J1-J7) — Chat + Paiement

- J1: envoyer message texte (E2E + API + UI)
- J2: envoyer image dans chat (compression + retry)
- J3: envoyer audio dans chat (enregistrement + upload)
- J4: bouton payer depuis chat (UI + endpoint init)
- J5: confirmation paiement dans conversation (event socket + historique)
- J6: historique wallet lisible (debit/credit/frais)
- J7: bugfix + stabilisation + tests de non-regression

## Semaine 2 (J8-J14) — Social commerce

- J8: carte produit cliquable dans feed
- J9: ouvrir discussion vendeur depuis produit
- J10: conversion discussion -> commande simple
- J11: paiement commande sans quitter l'app
- J12: etat commande basique (cree/payee/livree)
- J13: onboarding 10 vendeurs locaux (scripts + tracking)
- J14: bugfix + instrumentation conversion

## Semaine 3 (J15-J21) — Mode Afrique + Upload

- J15: profil low-data actif (reduction qualite image/video)
- J16: fallback reseau lent (timeouts + retry + messages explicites)
- J17: upload image robuste (content URI Android + cache local)
- J18: upload video robuste (token refresh + retry safe)
- J19: upload texte/article stable + validations
- J20: edition profil + avatar sans crash/restart
- J21: tests de charge basique + bugfix

## Semaine 4 (J22-J30) — Lancement terrain + croissance

- J22: dashboard verite (ok/partial/todo, preuves)
- J23: commission transaction 1-3% configurable
- J24: vendeur premium (badge + mise en avant)
- J25: promo locale utile (format non-spam)
- J26: referral invite -> bonus wallet
- J27: checklist lancement ville pilote (Bamako/Abidjan/Dakar)
- J28: run pilote avec 50 vendeurs / 500 users (tracking)
- J29: corrections issues terrain prioritaires
- J30: freeze + release candidate + plan 60 jours

## Definition de preuve quotidienne (obligatoire)

Chaque livrable journalier doit inclure:

- fichier(s) modifies
- test(s) execute(s)
- capture ou endpoint verifiable
- impact KPI (activation, conversion, retention, GMV, cout data)

## KPI minimum a suivre

- taux message -> paiement
- taux feed produit -> discussion
- taux discussion -> achat
- succes upload video/image
- crash free sessions
- consommation data moyenne/session

