# Mises à jour mobile — config Render + test Play Internal Testing

Guide pour valider le flux **MAJ recommandée / obligatoire** + **Google Play In-App Updates** sur un APK installé depuis le Play Store (internal testing).

**État repo (référence)** : `frontend/app.json` → `android.versionCode` = **24**  
**Backend prod** : `https://afriwonder.onrender.com` (voir `frontend/eas.json`)

---

## 1. Variables Render (backend)

**Render** → service backend → **Environment** → ajouter ou modifier :

### Scénario A — MAJ recommandée (test initial)

| Variable | Valeur | Effet |
|----------|--------|--------|
| `MOBILE_ANDROID_LATEST_VERSION_CODE` | `25` | Utilisateurs en **24** voient la modale « Mise à jour disponible » |
| `MOBILE_ANDROID_MIN_VERSION_CODE` | *(vide ou `0`)* | Pas de blocage forcé |
| `MOBILE_ANDROID_STORE_URL` | *(optionnel)* `https://play.google.com/store/apps/details?id=com.afriwonder.app` | Fiche Play par défaut si vide |

### Scénario B — MAJ obligatoire

| Variable | Valeur | Effet |
|----------|--------|--------|
| `MOBILE_ANDROID_LATEST_VERSION_CODE` | `25` | Dernière version cible |
| `MOBILE_ANDROID_MIN_VERSION_CODE` | `25` | Toute build **&lt; 25** est bloquée (modale sans « Plus tard ») |

### iOS (optionnel, plus tard)

| Variable | Valeur |
|----------|--------|
| `MOBILE_IOS_LATEST_BUILD_NUMBER` | numéro build App Store |
| `MOBILE_IOS_MIN_BUILD_NUMBER` | seuil obligatoire |
| `MOBILE_IOS_STORE_URL` | URL App Store |

Après modification : **Save** → attendre le redéploiement Render (~1–3 min).

---

## 2. Vérifier que le backend expose la bonne politique

```bash
curl -s https://afriwonder.onrender.com/api/mobile/app-version
```

Réponse attendue (exemple scénario A) :

```json
{
  "success": true,
  "data": {
    "android": {
      "min_version_code": 0,
      "latest_version_code": 25,
      "store_url": "https://play.google.com/store/apps/details?id=com.afriwonder.app",
      "update_message": "Une nouvelle version d'AfriWonder est disponible...",
      "force_update_message": "Cette version d'AfriWonder n'est plus supportée...",
      "use_play_in_app_update": true
    },
    "ios": { ... }
  }
}
```

Si `latest_version_code` vaut **0** ou **24** → aucune modale côté app (comportement normal).

---

## 3. Alternative admin (sans toucher aux variables d’env)

Super admin authentifié :

```http
PUT https://afriwonder.onrender.com/api/admin/settings
Authorization: Bearer <JWT_SUPER_ADMIN>
Content-Type: application/json
```

```json
{
  "mobile_app_update": {
    "android": {
      "latest_version_code": 25,
      "min_version_code": 0,
      "update_message": "Une nouvelle version d'AfriWonder est disponible. Veuillez mettre à jour l'application pour bénéficier des dernières fonctionnalités et améliorations.",
      "force_update_message": "Cette version d'AfriWonder n'est plus supportée. Veuillez mettre à jour l'application pour continuer.",
      "use_play_in_app_update": true
    }
  }
}
```

La config admin **fusionne** avec les variables d’env (admin prime sur les champs renseignés).

Lecture : `GET /api/admin/settings` → champ `mobile_app_update`.

---

## 4. Play Console — internal testing

### 4.1 Publier la « nouvelle » version (25)

1. Incrémenter `versionCode` dans `frontend/app.json` (ex. **24 → 25**) *ou* laisser EAS `autoIncrement` sur le profil `production`.
2. Build AAB :

```bash
cd frontend
eas build -p android --profile production
```

3. **Play Console** → AfriWonder → **Testing** → **Internal testing** → **Create new release**.
4. Uploader le `.aab` (versionCode **25**).
5. Valider et **roll out** sur internal testing.

### 4.2 Garder une version « ancienne » pour le test

Sur le téléphone de test :

1. Installer d’abord un AAB/APK **versionCode 24** **depuis le lien internal testing** (pas sideload USB).
2. Ne pas mettre à jour vers 25 tout de suite.
3. Ouvrir AfriWonder → la modale doit apparaître (build release, pas Expo Go).

> **Important** : Google Play In-App Updates ne fonctionne que si l’app a été **installée via le Play Store** (y compris internal testing). Un APK copié à la main ne déclenche pas le flux natif.

---

## 5. Comportement attendu sur le téléphone

| Cas | Modale | Bouton « Mettre à jour » |
|-----|--------|---------------------------|
| `24 < latest (25)`, min non atteint | Recommandée + « Plus tard » | Play **Flexible** (téléchargement in-app) ou Play Store en secours |
| `24 < min (25)` | Obligatoire, pas de fermeture | Play **Immediate** ou Play Store en secours |

Au retour au premier plan (`AppState` → `active`), la vérification se relance.

---

## 6. Checklist rapide si rien ne s’affiche

- [ ] Build **release** (pas `__DEV__`, pas Expo Go)
- [ ] `curl .../api/mobile/app-version` → `latest_version_code` **&gt;** version installée
- [ ] Téléphone a accès à `https://afriwonder.onrender.com` (proxy mobile Expo OK)
- [ ] App installée **depuis Play internal testing**, pas sideload
- [ ] Version **25** bien publiée sur internal testing avant de tester depuis **24**
- [ ] Pas de « Plus tard » déjà cliqué pour cette `latest_version_code` (stocké localement) — désinstaller/réinstaller ou incrémenter `latest`

---

## 7. Automatisation Render (après chaque `eas build` production)

Le script `frontend/scripts/sync-render-mobile-version.cjs` pousse automatiquement le `versionCode` de `app.json` vers Render après un build **production** réussi (`npm run eas:android:production`).

### Configuration une seule fois (machine qui lance les builds EAS)

| Variable | Où la trouver |
|----------|----------------|
| `RENDER_API_KEY` | Render Dashboard → **Account Settings** → **API Keys** → Create |
| `RENDER_SERVICE_ID` | Render Dashboard → service backend **AfriWonder** → **Settings** → ID `srv-…` |

Optionnel : `RENDER_SERVICE_NAME=AfriWonder` si vous ne voulez pas copier l’ID.

**Windows (session PowerShell) :**

```powershell
$env:RENDER_API_KEY = "rnd_xxxxxxxx"
$env:RENDER_SERVICE_ID = "srv_xxxxxxxx"
npm run eas:android:production
```

**Test sans appel API :**

```powershell
npm run sync:render:mobile-version:dry-run
```

**Manuel (sans rebuild) :**

```powershell
npm run sync:render:mobile-version
```

Le script met à jour **uniquement** `MOBILE_ANDROID_LATEST_VERSION_CODE` (et iOS si build iOS). Il **ne modifie pas** `MOBILE_ANDROID_MIN_VERSION_CODE` — gardez `0` ou vide sur Render pour les MAJ facultatives ; montez `MIN` seulement quand vous voulez une MAJ **obligatoire**.

### Vérification après sync

```powershell
curl.exe -s -H "User-Agent: AfriWonder-Mobile/1.0" "https://afriwonder.onrender.com/api/mobile/app-version"
```

---

## 8. À chaque release production (manuel si pas d’API key)

1. Noter le `versionCode` du AAB publié sur Play.
2. Mettre à jour Render : `MOBILE_ANDROID_LATEST_VERSION_CODE=<ce numéro>` **ou** lancer `npm run sync:render:mobile-version`.
3. Ajuster `MOBILE_ANDROID_MIN_VERSION_CODE` si vous voulez forcer les anciennes builds.
4. Vérifier avec `curl .../api/mobile/app-version`.

---

*Document lié au code : `backend/src/services/mobileAppVersion.service.ts`, `frontend/src/components/common/AppUpdatePrompt.tsx`, `frontend/scripts/sync-render-mobile-version.cjs`.*
