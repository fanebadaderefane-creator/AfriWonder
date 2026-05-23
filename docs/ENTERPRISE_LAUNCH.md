# 🚀 Afrofounder — Checklist Lancement Enterprise

> Objectif: Stabiliser pour production à grande échelle. Métriques fiables, persistance totale, architecture scalable.

## ✅ 1. Comptage des vues (implémenté)

| Règle | Statut |
|-------|--------|
| Créateur ≠ ses propres vues | ✅ `recordView` vérifie `viewer_id !== creator_id` |
| Rafraîchir ≠ incrément | ✅ Vue uniquement via `POST /videos/:id/view` (pas dans `getById`) |
| Scroll rapide ≠ vue | ✅ Requiert ≥3 sec ou ≥25% visionné |
| 1 vue / 30 min / user ou device | ✅ Unique `(video_id, viewer_key, time_bucket)` |
| Backend source de vérité | ✅ Table `VideoView` + `Video.views` incrémenté côté serveur |

**Table** `VideoView`: `id`, `video_id`, `viewer_key`, `time_bucket`, `created_at`  
**Endpoint** `POST /api/videos/:id/view` avec `{ watchSeconds, watchPercent, deviceId }`

---

## 🔲 2. Persistance des données

- [ ] PostgreSQL avec WAL activé
- [ ] Sauvegardes quotidiennes (`pg_dump` cron)
- [ ] Replication read-replica (optionnel)
- [ ] Migrations versionnées (Prisma)
- [ ] Aucune donnée critique en mémoire volatile seule

**Script backup** (à ajouter en cron):
```bash
pg_dump -h localhost -U user -d afriwonder > backup_$(date +%Y%m%d).sql
```

---

## 🔲 3. Architecture scale (10k → 1M users)

| Composant | Action |
|-----------|--------|
| API | Stateless ✅ |
| Load balancer | Configurer (nginx / cloud) |
| Redis | Cache feed, vues (TTL) |
| CDN | Vidéos statiques |
| Storage | S3-like (vidéos) |
| Queue | RabbitMQ / SQS pour jobs async |
| DB read replicas | Pour lecture-only |

---

## 🔲 4. Performance & charge

- [ ] Stress tests (k6 / Locust)
- [ ] 100k connexions simultanées
- [ ] Métriques p95 latency
- [ ] Alertes downtime

---

## 🔲 5. Data integrity & risk control

| Principe | Statut |
|----------|--------|
| Transactions ACID | ✅ Prisma |
| Idempotence webhook | ✅ `completeTip` + VideoView unique |
| Audit logs | ⚠️ Partiel (webhook logs) |
| Soft deletes | À évaluer par entité |

---

## 🔲 6. Observabilité

- [ ] Logs centralisés (Loki / ELK)
- [ ] Tracing distribué (OpenTelemetry)
- [ ] Dashboards Grafana
- [ ] Alerting uptime
- [ ] Webhook monitoring (logs dédiés ✅)

---

## 🔲 7. Caching

- [ ] Cache feed & vues (Redis, TTL)
- [ ] Invalidation automatique
- [ ] **Pas de cache** sur wallets

---

## 🔲 8. QA & prod gate

- [ ] Tests unitaires critiques
- [ ] Tests d'intégration
- [ ] Tests charge
- [ ] Feature flags
- [ ] Rollback instantané (blue/green)

---

## 🔲 9. Conformité & sécurité

- [ ] KYC créateurs
- [ ] Gouvernance admin
- [ ] Monitoring fraude
- [ ] SLA prod
- [ ] Plan incident majeur
