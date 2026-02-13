# Scaling vers 1M utilisateurs simultanés – AfriWonder

Ce guide décrit les étapes pour dimensionner l'infrastructure AfriWonder vers 1 million d'utilisateurs simultanés.

---

## 1. État actuel (MVP)

| Composant | Configuration actuelle |
|-----------|------------------------|
| Backend | PM2 cluster (instances: max), Nginx reverse proxy |
| Load tests | k6 + Node.js (500 requêtes, 50 concurrent ; k6 jusqu'à 1000 VUs) |
| Base de données | PostgreSQL, pool de connexions, ~556 index |
| Cache | Redis (rate limiting) |
| CDN vidéos | Cloudflare R2 |

---

## 2. Tests de charge pour valider le scaling

### Exécuter les load tests

```bash
# Backend doit être démarré
cd backend

# Test Node (sans k6)
npm run load-test

# Test k6 (smoke → load → stress jusqu'à 1000 VUs)
k6 run scripts/load-test.k6.js
```

### Variables pour simulation haute charge

```bash
# 10 000 requêtes, 500 concurrent
LOAD_REQUESTS=10000 LOAD_CONCURRENT=500 npm run load-test

# k6 avec URL de staging/prod
API_URL=https://api.afriwonder.com k6 run scripts/load-test.k6.js
```

### Seuils à surveiller

- **P95 latence** < 2000 ms
- **Taux d'échec** < 1 %
- **RPS** (requêtes/seconde) : mesurer le débit maximal avant dégradation

---

## 3. Architecture cible pour 1M utilisateurs

### 3.1 Horizontal scaling

| Composant | Action |
|-----------|--------|
| **Backend** | Plusieurs serveurs app, load balancer (Nginx ou cloud LB) |
| **PM2** | Garder `instances: 'max'` par serveur |
| **Load balancer** | Nginx ou AWS ALB / Cloud Load Balancer |
| **Redis** | Redis Cluster ou Redis Sentinel pour HA |
| **PostgreSQL** | Réplication streaming (read replicas) |

### 3.2 Kubernetes (optionnel)

Pour auto-scaling dynamique :

1. Déployer l'application en pods (Docker)
2. Configurer HPA (Horizontal Pod Autoscaler) sur CPU/mémoire
3. Ingress pour le load balancing
4. Externaliser Redis et PostgreSQL (managed services)

### 3.3 CDN et vidéos

- **Cloudflare R2** + custom domain (cdn.afriwonder.com)
- **Streaming HLS** : déjà en place côté frontend (hls.js)
- **Transcoding** : envisager un service (AWS MediaConvert, Cloudflare Stream) pour générer les qualités adaptatives

---

## 4. Checklist scaling

| Étape | Priorité |
|-------|----------|
| Load test k6 jusqu'à 500–1000 VUs | Court terme |
| Ajouter 2–3 serveurs backend derrière Nginx | Court terme |
| Redis Cluster ou Sentinel | Moyen terme |
| Réplication PostgreSQL (read replicas) | Moyen terme |
| Kubernetes ou orchestration cloud | Long terme |
| CDN vidéos (R2 + custom domain) | Court terme |

---

## 5. Estimation de capacité

- **1 serveur** : ~500–2000 connexions simultanées (selon CPU/RAM)
- **5 serveurs** : ~2500–10 000 connexions
- **20+ serveurs + Redis cluster + DB répliquée** : préparation pour 100k–1M

Pour 1M utilisateurs vraiment simultanés, prévoir une architecture distribuée avec plusieurs régions (multi-AZ / multi-région).

---

*Document créé pour l'audit production – février 2026*
