# Observabilité — AfriWonder Backend (CDC)

## Health

- **GET /health** — Liveness : statut OK, timestamp, env. Pas d’auth.
- **GET /health/ready** — Readiness : vérifie la connexion DB (`SELECT 1`). Retourne 503 si DB indisponible.
- **GET /health/region** — Pays / devise (CEDEAO).
- **GET /health/errors** — Résumé des erreurs récentes (optionnel : header `X-Health-Key` ou query `key` = `HEALTH_API_KEY`).
- **GET /health/metrics** — Métriques HTTP agrégées (JSON). Optionnel : même auth que ci‑dessus.

## Prometheus

- **GET /metrics** — Exposition au format Prometheus (text/plain). Idéal pour un scraper Prometheus (scrape_config).

  Métriques exposées :
  - `afriwonder_uptime_seconds` (gauge)
  - `afriwonder_http_requests_total` (counter)
  - `afriwonder_http_requests_errors_total` (counter)
  - `afriwonder_http_request_duration_seconds` (histogram, buckets en secondes)
  - `afriwonder_http_requests_by_route_total{method, path}` (counter)
  - `afriwonder_http_errors_by_route_total{method, path}` (counter)

  En production, protéger avec `HEALTH_API_KEY` (header `X-Health-Key` ou query `key`).

  Exemple Prometheus `scrape_config` :

  ```yaml
  scrape_configs:
    - job_name: 'afriwonder-api'
      metrics_path: /metrics
      static_configs:
        - targets: ['api.afriwonder.com:443']
      scheme: https
      # Si protégé :
      # params:
      #   key: ['VOTRE_HEALTH_API_KEY']
  ```

## Logs structurés

Le logger (`src/utils/logger.ts`) produit des logs structurés :

- **Développement** : préfixe `[LEVEL]` + objet JSON.
- **Production ou LOG_FORMAT=json** : une ligne JSON par log (champs `level`, `message`, `timestamp`, `context`, `error` si présent). Adapté à l’ingestion (ELK, Datadog, CloudWatch, etc.).

Exemple ligne JSON :

```json
{"level":"info","message":"Item added to cart","timestamp":"2025-03-11T12:00:00.000Z","context":{"userId":"...","productId":"...","quantity":2}}
```

## Request ID

Le middleware `attachRequestId` ajoute un `X-Request-Id` à chaque requête (propagation pour tracer une requête dans les logs et l’APM).

## Résumé

| Élément        | Endpoint / réglage              |
|----------------|----------------------------------|
| Liveness       | GET /health                      |
| Readiness      | GET /health/ready                |
| Prometheus     | GET /metrics                     |
| Logs structurés| LOG_FORMAT=json ou NODE_ENV=prod |
| Request ID     | Header X-Request-Id              |
