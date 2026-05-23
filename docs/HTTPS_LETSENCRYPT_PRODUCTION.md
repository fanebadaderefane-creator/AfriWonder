# HTTPS + Let's Encrypt (Production)

This setup uses:

- Nginx frontend container (serves app + reverse proxy `/api`)
- Certbot container (auto renew every 12h)
- Automatic HTTP -> HTTPS redirect

## 1. Required env vars

Set these in your production `.env`:

```env
DOMAIN=api.afriwonder.com
LETSENCRYPT_EMAIL=admin@afriwonder.com
```

Use your real domain and email.

Also ensure backend env uses HTTPS origin:

```env
CORS_ORIGIN=https://api.afriwonder.com
```

## 2. First certificate issuance (one-time)

Start stack first:

```bash
docker compose -f docker-compose.prod.yml up -d --build frontend backend postgres redis
```

Request certificate:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos --no-eff-email
```

Reload nginx:

```bash
docker compose -f docker-compose.prod.yml exec frontend nginx -s reload
```

## 3. Automatic renewal

The `certbot` service runs:

```bash
certbot renew --webroot -w /var/www/certbot
```

every 12h.

After renewal, reload nginx:

```bash
docker compose -f docker-compose.prod.yml exec frontend nginx -s reload
```

You can automate this reload in your CI/CD or server cron.
