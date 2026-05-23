# Configuration Agora pour le flux vidéo Live

> Ce guide configure le **backend** AfriWonder pour générer des tokens Agora RTC, afin d'activer le **flux vidéo réel** sur les pages LiveStream (créateur) et LiveView (spectateurs).

---

## Prérequis

- Compte Agora (gratuit) : [https://console.agora.io](https://console.agora.io)
- Backend AfriWonder en cours d'exécution

---

## Étape 1 : Créer un projet Agora

1. Connectez-vous à [Agora Console](https://console.agora.io)
2. **Project Management** → **Create**
3. Donnez un nom au projet (ex. `AfriWonder Live`)
4. Choisissez **Secured mode** : **APP ID + Token (Recommended)**
5. (Optionnel) Activez les produits souhaités (Video calling est inclus par défaut)
6. Cliquez sur **Submit**

---

## Étape 2 : Activer l’App Certificate

1. Dans la liste des projets, cliquez sur votre projet
2. Onglet **Config**
3. À **Primary Certificate**, cliquez sur **Enable**
4. Copiez et sauvegardez le **Certificate** (longue chaîne hexadécimale)

---

## Étape 3 : Récupérer l’App ID

1. Toujours dans **Project Management** → votre projet
2. Copiez l’**App ID** (chaîne de caractères, ex. `a1b2c3d4e5f6...`)

---

## Étape 4 : Configurer le backend

Ajoutez les variables d’environnement dans `backend/.env` :

```env
# Live Streaming (Agora)
AGORA_APP_ID=votre_app_id_ici
AGORA_APP_CERTIFICATE=votre_certificat_ici
```

**Exemple :**
```env
AGORA_APP_ID=a1b2c3d4e5f6789012345678
AGORA_APP_CERTIFICATE=abc123def456...
```

> **Important** : Ne commitez jamais ces valeurs dans le dépôt. Utilisez `.env` (dans `.gitignore`).

---

## Étape 5 : Redémarrer le backend

```bash
cd backend
npm run dev
```

Le backend doit redémarrer pour prendre en compte les nouvelles variables.

---

## Vérification

1. Lancez un live depuis **LiveStream** (titre + catégorie → Commencer le live)
2. Une fois le live démarré, la caméra doit s’afficher à la place du message « Configurez Agora (backend)... »
3. Ouvrez **LiveView** dans un autre navigateur/onglet pour vérifier que les spectateurs voient bien le flux

---

## Flux technique

| Composant | Rôle |
|-----------|------|
| **Frontend** (LiveStream) | Appelle `GET /api/live/:id/token?role=host` au démarrage du stream |
| **Backend** (live.service) | Génère un token Agora avec `appId`, `channel` (room_id), `uid` |
| **useAgoraHost** | Initialise `agora-rtc-sdk-ng` avec le token et publie caméra/micro |
| **useAgoraAudience** | Permet aux spectateurs de rejoindre le channel et afficher le flux |

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Message « Configurez Agora... » toujours affiché | Vérifiez que `AGORA_APP_ID` et `AGORA_APP_CERTIFICATE` sont bien définis dans `backend/.env` et que le backend a été redémarré |
| Erreur « Agora init failed » | Vérifiez les credentials, le mode du projet (Token), et la console Agora pour d’éventuelles restrictions |
| Caméra bloquée par le navigateur | Acceptez l’autorisation caméra/micro quand le navigateur le demande |
| Spectateurs ne voient pas le flux | Vérifiez que le créateur est bien en mode « live » et que le token audience est récupéré correctement |

---

## Références

- [Agora Video Calling – Get Started](https://docs.agora.io/en/video-calling/get-started/get-started-sdk)
- [Token Authentication](https://docs.agora.io/en/video-calling/develop/authentication-workflow)
- [Agora RTC Web SDK](https://www.npmjs.com/package/agora-rtc-sdk-ng)
