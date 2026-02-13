# Configuration WAF Cloudflare – AfriWonder

Ce guide décrit la configuration du WAF (Web Application Firewall) Cloudflare pour protéger l'API et le frontend AfriWonder.

---

## 1. Prérequis

- Domaine pointant vers Cloudflare (proxy activé, orange cloud)
- Compte Cloudflare (gratuit ou Pro/Business pour plus de règles)

---

## 2. Activer le proxy Cloudflare

1. **DNS** : Cloudflare Dashboard → DNS → Enregistrements
2. Pour `api.afriwonder.com` et `afriwonder.com`, le proxy doit être **activé** (icône orange)
3. Les requêtes passent par les serveurs Cloudflare avant d'atteindre votre origine

---

## 3. WAF – Règles de base (gratuit)

### 3.1 Security Level

**Security** → **Settings** → **Security Level** : `Medium` ou `High` selon le trafic attendu.

- **Medium** : utile pour le lancement
- **High** : si vous constatez des attaques

### 3.2 Challenge passé (CAPTCHA)

Les requêtes soupçonnées (bot, IP à risque) sont soumises à un challenge avant d'accéder au site.

### 3.3 Under Attack Mode

En cas d'attaque DDoS : **Security** → **Settings** → **Under Attack Mode** → activer temporairement. Toutes les requêtes passent par un challenge JavaScript (5 secondes).

---

## 4. WAF – Règles personnalisées (Pro/Business)

### 4.1 Bloquer les pays non ciblés (optionnel)

Si vous ciblez uniquement le Mali et l'Afrique de l'Ouest :

**Security** → **WAF** → **Custom rules** :

- **Rule** : `(ip.geoip.country ne "ML" and ip.geoip.country ne "SN" and ip.geoip.country ne "BF" and ...)`
- **Action** : Block ou Challenge

### 4.2 Rate limiting sur l'API

**Security** → **WAF** → **Rate limiting rules** :

- **Path** : `api.afriwonder.com/api/*`
- **Threshold** : 100 requêtes / 1 minute par IP
- **Action** : Block 10 minutes

### 4.3 Bloquer les User-Agents suspects

- **Rule** : `(http.user_agent contains "bot" and not http.user_agent contains "Googlebot")`
- **Action** : Challenge

---

## 5. Page Rules (Cache et sécurité)

### 5.1 Désactiver le cache pour l'API

- **URL** : `api.afriwonder.com/*`
- **Cache Level** : Bypass

### 5.2 Cache pour le frontend

- **URL** : `afriwonder.com/*`
- **Cache Level** : Standard
- **Browser Cache TTL** : Respect Existing Headers

---

## 6. SSL/TLS

**SSL/TLS** → **Overview** :

- **Encryption mode** : Full (strict) si votre origine a un certificat valide
- **Always Use HTTPS** : activé
- **Minimum TLS Version** : 1.2

---

## 7. Headers de sécurité (Transform Rules)

Pour ajouter des headers côté Cloudflare :

**Rules** → **Transform Rules** → **Modify Response Header** :

- **When** : `(http.host eq "api.afriwonder.com")`
- **Headers** :
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `SAMEORIGIN`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`

*(Votre backend envoie déjà ces headers via Helmet ; Cloudflare peut les renforcer.)*

---

## 8. Checklist

- [ ] Proxy Cloudflare activé (orange cloud) sur les enregistrements DNS
- [ ] Security Level configuré (Medium ou High)
- [ ] SSL/TLS en Full (strict)
- [ ] Cache bypass pour l'API
- [ ] Under Attack Mode disponible en cas de crise
- [ ] (Pro) Rate limiting sur l'API
- [ ] (Pro) Règles WAF personnalisées selon besoins

---

## 9. Monitoring

- **Analytics** → **Security** : voir les requêtes bloquées, challenges, etc.
- **Notifications** : configurer des alertes (ex. pic de trafic, attaque détectée)

---

*Document créé pour l'audit production – février 2026*
