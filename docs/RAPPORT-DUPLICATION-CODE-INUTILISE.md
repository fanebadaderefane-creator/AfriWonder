# Rapport AfriWonder — Duplications et code inutilisé

## 1. Duplications identifiées

### 1.1 StarRating (à corriger)
| Fichier | Rôle |
|---------|------|
| **`src/components/common/StarRating.jsx`** | Composant partagé (`rating`, `onRate`, `size`, `readOnly`) — **jamais importé** |
| **`src/pages/ProviderProfile.jsx`** (l.131) | Fonction locale `StarRating({ value, size })` — même rôle (affichage étoiles) |

**Recommandation :** Utiliser le composant commun `@/components/common/StarRating` dans `ProviderProfile.jsx` avec `rating={value}` et `readOnly={true}` pour supprimer la duplication.

---

### 1.2 Cartes prestataires
| Fichier | Rôle |
|---------|------|
| **`src/components/common/ProviderCard.jsx`** | Carte prestataire réutilisée (Marketplace, Providers, Favorites, MaliConnectHome) |
| **`src/components/maison/FeaturedProviders.jsx`** | Composant local `FeaturedProviderCard` — même idée (carte + badge), **jamais importé** |

**Recommandation :** Soit supprimer `FeaturedProviders.jsx` (orphelin), soit l’utiliser là où une grille “prestataires en vedette” est dupliquée (ex. MaliConnectHome).

---

### 1.3 Hero / bannière
| Fichier | Rôle |
|---------|------|
| **`src/components/common/ModuleHero.jsx`** | Hero des modules (EventsMaliConnect, JobsMaliConnect, Health, etc.) — **utilisé** |
| **`src/components/maison/HeroSection.jsx`** | Hero avec recherche — **jamais importé** |

**Recommandation :** Supprimer `HeroSection.jsx` ou l’intégrer si une page a besoin d’un hero avec recherche.

---

### 1.4 Bouton Retour
Le même pattern (Bouton + `ArrowLeft` + `navigate(-1)`) est répété dans de nombreuses pages.  
**Recommandation :** Créer un composant `BackButton` (ex. `@/components/common/BackButton.jsx`) et l’utiliser partout pour respecter la règle `.cursor/rules/navigation-back-arrow.mdc` et éviter la duplication.

---

## 2. Code / fichiers inutilisés

### 2.1 Composants jamais importés (orphelins)
| Fichier | Action suggérée |
|---------|------------------|
| **`src/components/common/StarRating.jsx`** | À utiliser dans `ProviderProfile.jsx` (remplacer la fonction locale) |
| **`src/components/maison/HeroSection.jsx`** | Supprimer ou intégrer dans une page |
| **`src/components/maison/FeaturedProviders.jsx`** | Supprimer ou utiliser (ex. MaliConnectHome) |
| **`src/components/maison/CategoryGrid.jsx`** | Supprimer ou utiliser |

### 2.2 Export inutilisé
| Fichier | Export | Action |
|---------|--------|--------|
| **`src/lib/utils.js`** | **`isIframe`** | Supprimer l’export (ou le garder si prévu pour un usage futur, ex. PWA embed). |

### 2.3 Pages MaliConnect non enregistrées
Les pages suivantes **existent** mais **ne sont pas** dans `pages.config.js`. Elles n’ont donc **pas de route** (`/MaliConnectHome`, etc.) et ne sont pas accessibles depuis le menu (le menu pointe vers Events, Jobs, News, etc. via les pages standard).

| Page | Fichier |
|------|---------|
| MaliConnectHome | `src/pages/MaliConnectHome.jsx` |
| AdminMaliConnectDashboard | `src/pages/AdminMaliConnectDashboard.jsx` |
| ProviderDashboardMaliConnect | `src/pages/ProviderDashboardMaliConnect.jsx` |
| BecomeProviderMaliConnect | `src/pages/BecomeProviderMaliConnect.jsx` |
| EventsMaliConnect | `src/pages/EventsMaliConnect.jsx` |
| JobsMaliConnect | `src/pages/JobsMaliConnect.jsx` |
| AssuranceMaliConnect | `src/pages/AssuranceMaliConnect.jsx` |
| MicrocreditMaliConnect | `src/pages/MicrocreditMaliConnect.jsx` |
| CrowdfundingMaliConnect | `src/pages/CrowdfundingMaliConnect.jsx` |
| NewsMaliConnect | `src/pages/NewsMaliConnect.jsx` |

**Recommandation :** Soit les enregistrer dans `pages.config.js` et les lier depuis le menu (remplacer Events → EventsMaliConnect, etc.), soit les supprimer si elles ne sont plus prévues.

---

## 3. Ce qui est déjà sain
- **Un seul client API** : `src/api/expressClient.js` (pas de duplication).
- **Route /Services** : redirection vers `/Marketplace` dans `App.jsx` ; plus de référence à l’ancien `Services.jsx` (supprimé).
- **ProviderCard** : `DEFAULT_CARD_IMAGE` centralisé dans `ProviderCard.jsx`, réutilisé par ProviderProfile et FeaturedProviders.

---

## 4. Actions effectuées (dans cette session)
- Utilisation du composant commun **StarRating** dans `ProviderProfile.jsx` (suppression de la fonction locale dupliquée).
- Suppression de l’export **`isIframe`** inutilisé dans `src/lib/utils.js`.

## 5. Actions suggérées (à faire selon besoin)
1. Créer **BackButton** et remplacer les boutons Retour dupliqués.
2. Supprimer ou utiliser **HeroSection.jsx**, **FeaturedProviders.jsx**, **CategoryGrid.jsx**.
3. Décider du sort des **pages MaliConnect*** : les enregistrer dans le routeur ou les supprimer.
