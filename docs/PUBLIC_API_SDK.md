# AfriWonder Public API (v1)

Base URL: `https://<your-domain>/api/public/v1`

## Authentication

Use an API key in header:

```bash
x-api-key: <YOUR_PUBLIC_API_KEY>
```

In non-production, fallback key is:

```bash
afw_public_dev_key
```

Set production keys with:

```bash
PUBLIC_API_KEYS=key1,key2,key3
```

Rate and quota settings:

```bash
PUBLIC_API_RATE_LIMIT_PER_MIN=60
PUBLIC_API_DAILY_QUOTA=2000
```

## Endpoints

### `GET /health`

Public health endpoint (no API key required).

Example:

```bash
curl https://<your-domain>/api/public/health
```

### `GET /v1/health`

Versioned health endpoint (requires API key).

### `GET /v1/matching/opportunities`

Rules-based public preview for opportunity recommendations.

Required header:

```bash
x-api-key: <YOUR_PUBLIC_API_KEY>
```

Query params:

- `goal`: `earn_money | learn | find_job | entrepreneur`
- `location`: free text, ex `Bamako`
- `level`: `beginner | intermediate | advanced`
- `skills`: CSV, ex `design,marketing`
- `interests`: CSV, ex `business,education`
- `limit`: max `30`

Example:

```bash
curl -G "https://<your-domain>/api/public/v1/matching/opportunities" \
  -H "x-api-key: afw_public_dev_key" \
  --data-urlencode "goal=earn_money" \
  --data-urlencode "location=Bamako" \
  --data-urlencode "skills=design,marketing" \
  --data-urlencode "interests=business" \
  --data-urlencode "limit=10"
```

Response shape:

```json
{
  "success": true,
  "data": {
    "goal": "earn_money",
    "count": 10,
    "opportunities": [
      {
        "id": "job:...",
        "module": "jobs",
        "title": "...",
        "description": "...",
        "score": 92,
        "reason": ["Job ouvert", "Competences pertinentes"],
        "payload": {}
      }
    ],
    "meta": {
      "source": "rules-based-public-preview"
    }
  }
}
```

Response headers:

- `X-RateLimit-Limit-Minute`
- `X-RateLimit-Remaining-Minute`
- `X-RateLimit-Reset`
- `X-Quota-Limit-Daily`
- `X-Quota-Remaining-Daily`

### `GET /v1/usage`

Usage and observability endpoint for the current API key.

Required header:

```bash
x-api-key: <YOUR_PUBLIC_API_KEY>
```

Query params:

- `sinceHours`: lookback window in hours (`1` to `168`, default `24`)

Example:

```bash
curl -G "https://<your-domain>/api/public/v1/usage" \
  -H "x-api-key: afw_public_dev_key" \
  --data-urlencode "sinceHours=24"
```

Response shape:

```json
{
  "success": true,
  "data": {
    "keyAlias": "key_ab12cd",
    "window": {
      "sinceHours": 24,
      "since": "2026-02-21T12:00:00.000Z",
      "until": "2026-02-22T12:00:00.000Z"
    },
    "totals": {
      "calls": 42,
      "uniqueEndpoints": 3,
      "avgDurationMs": 34.2,
      "p95DurationMs": 87
    },
    "distribution": {
      "byEndpoint": {
        "GET /api/public/v1/matching/opportunities": 40
      },
      "byStatus": {
        "200": 41,
        "429": 1
      }
    },
    "quota": {
      "minute": { "limit": 60, "used": 3, "remaining": 57, "resetAt": 1700000000000 },
      "day": { "limit": 2000, "used": 10, "remaining": 1990, "resetAt": 1700000000000 }
    }
  }
}
```

## Minimal JS SDK snippet

```js
export async function getPublicOpportunities(params, apiKey) {
  const url = new URL('/api/public/v1/matching/opportunities', window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Public API error: ${res.status}`);
  return res.json();
}
```
