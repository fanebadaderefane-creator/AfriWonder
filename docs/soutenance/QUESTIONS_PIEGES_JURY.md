# AfriWonder — questions pièges (ne pas projeter)

Document personnel pour préparation orale. Ne pas inclure dans le deck public.

| # | Question piège | Ce qu’on teste | Erreur fatale | Réponse courte (à mémoriser) | Si panique |
|---|----------------|----------------|---------------|--------------------------------|------------|
| 1 | Où sont tes bounded contexts ? | modularité vs « big ball of mud » | « C’est modulaire, donc pas de dette » | **Monolithe modulaire** : routeurs + services par domaine ; schéma DB partagé pour transactions cross-domain utiles (wallet / commande). | « Découpage fichiers aujourd’hui ; découpage runtime quand les métriques l’imposent. » |
| 2 | JWT + révocation : contradiction ? | stateless réel ou non | « Un JWT ne se révoque pas » / nier le besoin | **Access court** + **refresh contrôlé** + **jti / liste** selon implémentation — ce n’est plus 100 % stateless, c’est un **compromis** documenté. | « Révocation sélective sans session serveur complète pour tous. » |
| 3 | Ton proxy vidéo : surface SSRF ? | relais d’URL arbitraires | « C’est interne, donc OK » | **Liste blanche** de domaines / règles d’URL ; **refus par défaut** ; pas d’open proxy. | « Je ne relaye pas n’importe quelle URL ; liste fermée. » |
| 4 | Où est ton IA ? | honnêteté scientifique | Inventer GPT dans le dépôt | **Traduction** : services HTTP externes ; **chatbot** : données / CRUD ; **STT / sous-titres** : pipeline prévu ou partiel selon branche — pas de modèle propriétaire embarqué « magique » démontré ici. | « IA hybride : intégrations externes ; pas de fine-tuning prouvé dans ce périmètre. » |
| 5 | Scaler Socket.IO horizontalement ? | sticky vs Redis adapter | Réponse floue | **Réplicas** derrière LB ; **rooms** par clés métier ; **Redis adapter** pour cohérence multi-instance si besoin. | « Multi-instance + médiation Redis pour les rooms si N > 1. » |
| 6 | Pourquoi pas GraphQL ? | coût de migration / perf équipe | Mépris gratuit du REST | REST déjà investi, tooling équipe, caches habituels ; GraphQL = surface et discipline supplémentaires — **décision de coût**. | « Pas une vérité absolue : choix pragmatique au vu de la surface existante. » |
| 7 | Montre une faille de ta grande API ? | méthodo sécu | Déni total ou jargon | Méthode **OWASP**, **revues**, **validation Zod**, **rate limit**, **moindre privilège** ; risque = **surface** ⇒ vigilance continue. | « Je traiterais ça par rapport de tests dynamiques + revue ciblée sur routes critiques. » |

## Pièges de vocabulaire

- Ne pas dire **Next.js** pour la PWA si le dépôt est **Vite**.
- Ne pas affirmer **LLM** dans le chatbot sans preuve dans le code présenté.
