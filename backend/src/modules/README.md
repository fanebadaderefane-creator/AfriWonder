# Modules domaine (monolithe modulaire)

Chaque dossier est une **frontière** : les routes métier vivent encore sous `src/routes/`, mais les imports **métier croisés** doivent passer par des services dédiés, pas par `routes/*` d’un autre domaine.

| Module        | Routes Express associées        |
|---------------|-----------------------------------|
| `auth/`       | `auth.routes.ts`, OAuth, sessions |
| `messaging/`  | `messages.routes.ts`, sockets DM |
| `payment/`    | `payments.routes.ts`, webhooks    |
| `marketplace/`| `orders.routes.ts`, panier        |

TODO(AFW-arch): déplacer progressivement la logique depuis `routes/*.ts` vers `services/*` déjà existants et n’exposer que des façade stables.
