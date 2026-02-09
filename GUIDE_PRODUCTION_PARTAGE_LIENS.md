# 🚀 Guide Production - Partage de Liens Vidéo

## ✅ Checklist Production pour le Partage de Liens

### 1. **Configuration HTTPS (OBLIGATOIRE)**

WhatsApp, Telegram et autres applications nécessitent **HTTPS** pour détecter les liens comme cliquables.

#### Actions à faire :
- ✅ Configurer un certificat SSL sur votre serveur
- ✅ Utiliser un domaine valide (pas localhost)
- ✅ Vérifier que toutes les URLs utilisent `https://`

#### Exemple de configuration :
```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # ... reste de la config
}
```

---

### 2. **Ajout des Métadonnées Open Graph**

Pour que les liens affichent un bel aperçu (image, titre, description) lors du partage, ajoutez les métadonnées Open Graph.

#### Modifier `index.html` :

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://votre-domaine.com/" />
<meta property="og:title" content="AfriConnect - Super App Africaine" />
<meta property="og:description" content="Plateforme de partage vidéo, marketplace et services pour l'Afrique" />
<meta property="og:image" content="https://votre-domaine.com/og-image.png" />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="https://votre-domaine.com/" />
<meta property="twitter:title" content="AfriConnect - Super App Africaine" />
<meta property="twitter:description" content="Plateforme de partage vidéo, marketplace et services pour l'Afrique" />
<meta property="twitter:image" content="https://votre-domaine.com/og-image.png" />
```

#### Pour les pages de vidéo individuelles (dynamique) :

Vous devrez générer dynamiquement les métadonnées Open Graph pour chaque vidéo. Créez un endpoint backend ou utilisez un service comme :

- **Option 1 : Endpoint Backend** qui génère les métadonnées
- **Option 2 : Service SSR** (Next.js, Remix) pour générer les meta tags dynamiquement
- **Option 3 : Service externe** comme Prerender.io ou Rendertron

---

### 3. **Configuration du Serveur pour React Router**

React Router utilise le client-side routing. Il faut configurer le serveur pour rediriger toutes les routes vers `index.html`.

#### Configuration Nginx :

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    root /path/to/dist;
    index index.html;
    
    # Rediriger toutes les routes vers index.html pour React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Configuration Apache (.htaccess) :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

### 4. **Vérification du Format des URLs**

Le code actuel génère les URLs au format :
```
https://votre-domaine.com/VideoView/?id=VIDEO_ID
```

#### ✅ Vérifications à faire :

1. **Tester le routage** :
   - Ouvrir `https://votre-domaine.com/VideoView/?id=VIDEO_ID` dans le navigateur
   - Vérifier que la vidéo s'affiche correctement

2. **Tester le partage WhatsApp** :
   - Partager un lien depuis l'application
   - Vérifier que le lien est cliquable dans WhatsApp
   - Cliquer sur le lien et vérifier la redirection

3. **Tester le partage Telegram** :
   - Même processus que WhatsApp

---

### 5. **Amélioration : Métadonnées Dynamiques par Vidéo**

Pour un meilleur aperçu lors du partage, créez une page de prévisualisation pour chaque vidéo.

#### Option A : Endpoint Backend pour Meta Tags

Créez un endpoint qui retourne les métadonnées d'une vidéo :

```typescript
// backend/src/routes/videos.routes.ts
router.get('/:id/meta', async (req, res) => {
  const video = await videoService.getById(req.params.id);
  
  res.json({
    title: video.title,
    description: video.description,
    image: video.thumbnail_url,
    url: `https://votre-domaine.com/VideoView/?id=${video.id}`
  });
});
```

#### Option B : Page de Prévisualisation (Recommandé)

Créez une page `/video/:id` qui affiche les métadonnées et redirige vers l'app :

```jsx
// src/pages/VideoPreview.jsx
export default function VideoPreview() {
  const { id } = useParams();
  const { data: video } = useQuery(['video', id], () => api.videos.getById(id));
  
  useEffect(() => {
    // Rediriger vers l'app après chargement
    window.location.href = `/VideoView/?id=${id}`;
  }, [id]);
  
  return (
    <div>
      {/* Meta tags dynamiques ici */}
      <meta property="og:title" content={video?.title} />
      <meta property="og:description" content={video?.description} />
      <meta property="og:image" content={video?.thumbnail_url} />
      {/* ... */}
    </div>
  );
}
```

---

### 6. **Test Final en Production**

#### Checklist de test :

- [ ] **HTTPS activé** : Vérifier que l'URL commence par `https://`
- [ ] **Domaine valide** : Pas de localhost ou IP
- [ ] **Routage fonctionne** : `/VideoView/?id=XXX` charge la vidéo
- [ ] **WhatsApp** : Le lien est cliquable et fonctionne
- [ ] **Telegram** : Le lien est cliquable et fonctionne
- [ ] **Copier lien** : Le lien copié fonctionne quand collé dans un navigateur
- [ ] **Aperçu social** : L'aperçu s'affiche correctement (si métadonnées configurées)

---

### 7. **Variables d'Environnement à Configurer**

Assurez-vous que ces variables sont configurées en production :

```env
# Frontend (.env.production)
VITE_API_URL=https://api.votre-domaine.com
VITE_APP_URL=https://votre-domaine.com

# Backend
FRONTEND_URL=https://votre-domaine.com
```

---

### 8. **Améliorations Optionnelles**

#### A. Raccourcisseur d'URL

Pour des liens plus propres, utilisez un service de raccourcissement :

```javascript
// Exemple avec votre propre service
const shortUrl = await api.shortenUrl(`/VideoView/?id=${video.id}`);
// Résultat : https://votre-domaine.com/v/abc123
```

#### B. QR Code pour Partage Hors-ligne

Ajoutez la génération de QR codes pour le partage physique :

```javascript
import QRCode from 'qrcode';

const qrCodeDataUrl = await QRCode.toDataURL(url);
// Afficher le QR code dans le modal de partage
```

#### C. Analytics de Partage

Trackez les partages pour les analytics :

```javascript
// Dans ShareSheet.jsx après le partage
api.analytics.trackShare({
  video_id: video.id,
  method: 'whatsapp', // ou 'telegram', 'copy', etc.
  timestamp: new Date().toISOString()
});
```

---

## 🎯 Résumé Rapide

1. ✅ **HTTPS obligatoire** - Configurez SSL
2. ✅ **Domaine valide** - Pas de localhost
3. ✅ **Routage serveur** - Rediriger vers index.html
4. ✅ **Métadonnées Open Graph** - Pour les aperçus
5. ✅ **Tester tous les canaux** - WhatsApp, Telegram, etc.

Une fois ces étapes complétées, les liens de partage fonctionneront parfaitement en production ! 🚀
