# Checklist audit sécurité – AfriWonder

Ce document sert de base pour un audit sécurité interne ou externe.

---

## 1. Authentification et autorisation

| Point | Statut | Détail |
|-------|--------|--------|
| Mots de passe hashés (bcrypt) | ✅ | `bcrypt.hash` |
| JWT avec expiration | ✅ | Access + refresh tokens |
| RBAC (rôles) | ✅ | admin, super_admin, user, etc. |
| 2FA pour admins | ✅ | User2FA, middleware |
| Rate limiting auth | ✅ | 5 login/15 min |

---

## 2. Paiements

| Point | Statut | Détail |
|-------|--------|--------|
| Validation signature Stripe | ✅ | `verifyStripeWebhook` |
| Validation signature Orange Money | ✅ | `verifyOrangeMoneyWebhookSignature` |
| Validation signature Moov | ✅ | `verifyMoovWebhookSignature` |
| Rejet en prod si secret manquant | ✅ | Orange/Moov |
| Idempotence webhook | ✅ | `confirmPayment` retourne succès si déjà payé |
| Pas de stockage de cartes | ✅ | Tokens Stripe uniquement |

---

## 3. API et entrées

| Point | Statut | Détail |
|-------|--------|--------|
| Rate limiting général | ✅ | 10 req/s, 600/min |
| Sanitization des entrées | ✅ | `sanitizeInputMiddleware` |
| CSRF protection | ✅ | `csrfProtectionMiddleware` |
| Anti-bot (User-Agent) | ✅ | `antiBotMiddleware` |
| Anti-spam (comments, messages) | ✅ | `antiSpamMiddleware` |
| CORS configuré | ✅ | `CORS_ORIGIN` |

---

## 4. Headers et HTTP

| Point | Statut | Détail |
|-------|--------|--------|
| Helmet | ✅ | Sécurité headers |
| X-Frame-Options | ✅ | Via Helmet |
| X-Content-Type-Options | ✅ | Via Helmet |
| HTTPS | 📋 | À configurer (Nginx/SSL) |

---

## 5. Dépendances

| Point | Statut | Détail |
|-------|--------|--------|
| npm audit | ✅ | Exécuté dans CI (voir ci.yml) |
| Snyk (optionnel) | ✅ | `security-scan` job |
| Mise à jour dépendances | 📋 | À planifier (renovate, dependabot) |

---

## 6. Logs et monitoring

| Point | Statut | Détail |
|-------|--------|--------|
| Logs sensibles évités | ✅ | Pas de tokens/mots de passe en clair |
| Sentry | ✅ | Si SENTRY_DSN |
| Health checks | ✅ | /health, /health/ready |
| Audit admin | ✅ | AdminAuditLog, SecurityLog |

---

## 7. Audit externe / pentest

À organiser avec un prestataire externe :

- [ ] Audit du code (OWASP, etc.)
- [ ] Penetration test (API, web)
- [ ] Revue des secrets et configurations

---

*Document créé pour l'audit production – février 2026*
