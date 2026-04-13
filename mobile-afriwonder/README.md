# AfriWonder — application mobile (Expo)

Le dépôt utilise **`frontend/`** comme application **Expo Router** officielle (SDK 54). Ce dossier **`mobile-afriwonder/`** sert de **point d’entrée documenté** aligné sur le brief « mobile-afriwonder » : tout le code, les écrans et les scripts npm sont dans `../frontend/`.

## Démarrer

```bash
cd frontend
npm install
npm run start
```

Ou depuis ce dossier (scripts relais vers `frontend/`) :

```bash
cd mobile-afriwonder
npm install   # optionnel : installe npm dans ce dossier minimal
npm run start
```

## Build EAS

Configuration : `frontend/eas.json`. Depuis la racine du dépôt :

```bash
cd frontend
npx eas build --platform android --profile preview
```

## API

Le client HTTP Expo pointe vers le backend partagé via **`/api/proxy/*`** (voir `frontend/src/api/client.ts` et `frontend/src/config/api.ts`).

Miroir brief v2 (URLs directes + réexport `API_ROUTES`) : `mobile-afriwonder/src/config/api.ts`.
