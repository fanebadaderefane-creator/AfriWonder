# Modèle de commissions AfriWonder

Source unique : **`backend/src/config/commissions.ts`**  
Calculs : **`backend/src/services/commission.service.ts`**

## 1. Vidéo social (TikTok-style)
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Tips / cadeaux virtuels | 30% plateforme | `videoTip.service.ts` |
| Cadeaux live | 50% partagé (25% créateur, 25% plateforme) | `live.service.ts` |
| Publicités in-feed | 100% plateforme | — |
| Abonnements créateurs | 20% plateforme (80% créateur) | `subscription.service.ts` |

## 2. Marketplace e-commerce
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission vendeur | 8–12% (défaut 10%) | `cart.service.ts` (getCartWithFeesBreakdown) |
| Listing produit | Gratuit (premium 5€/mois) | config |
| Promotion produits | 50–200 FCFA/jour/produit | config ; `product.service.ts` (frais fixes existants) |
| Flash sales | 15% commission | config ; `product.service.ts` (frais flash existants) |

## 3. Services professionnels
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission prestataire | 15–20% (défaut 17,5%) | `booking.service.ts`, `service-payout.service.ts` |
| Abonnement pro | 10€/mois | config |
| Lead qualifié | 1–3€/contact | config |
| Publicité locale | 20–100€/mois | config |

## 4. Transport (VTC/Taxi)
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission course | 20–25% (défaut 22,5%) | `commission.service.ts` → à appeler à la fin de course (paiement) |
| Frais annulation | 500–1000 FCFA (50% plateforme) | config ; routes `rides` (cancellation_fee) |
| Abonnement chauffeur | 5€/mois | config |

**À brancher** : lors du passage en `completed` avec paiement, calculer `commissionService.transportRide(fare_amount)` et créditer plateforme + chauffeur.

## 5. Livraison repas
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission restaurant | 25–30% (défaut 27,5%) | `commission.service.ts` → à appeler à la confirmation paiement commande |
| Frais livraison | 500–2000 FCFA (50/50 livreur) | config |
| Abonnement resto | 20€/mois | config |
| Mise en avant menu | 50–200€/mois | config |

**À brancher** : à la confirmation paiement d’une `FoodOrder`, `commissionService.foodRestaurant(total_amount)` + `foodDeliveryFee(delivery_fee)` et créditer plateforme / restaurant / livreur.

## 6. Télémedecine
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission consultation | 20–25% (défaut 22,5%) | `commission.service.ts` → à la confirmation paiement RDV |
| Abonnement médecin | 15€/mois | config |
| Pharmacie partenaire | 10% sur ordonnances | config |
| Assurance santé | 30–50€/an/user | config |

**À brancher** : à la confirmation paiement consultation, `commissionService.telemedicineConsultation(amount)`.

## 7. Immobilier
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission location | 1 mois loyer (partagé proprio/agent) | config |
| Plateforme | 30–50% de la commission agent | `commission.service.ts` → `propertyFromAgentCommission()` |
| Commission vente | 2–3% prix vente | `commission.service.ts` → `propertySale()` |
| Abonnement agent | 25€/mois | config |
| Mise en avant annonce | 10–50€/mois | config |

**À brancher** : à chaque commission perçue (location/vente), calculer part plateforme et créditer.

## 8. Billetterie
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission ticket | 10–15% (défaut 12,5%) | `event.service.ts` (confirmTicketPayment) |
| Frais service acheteur | 2–5% | config ; optionnel côté checkout |
| Organisateur pro | 30€/mois | config |
| Promotion événement | 50–500€/event | config |

## 9. Paiement factures
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Frais transaction | 1–2% (min 100 FCFA) | `commission.service.ts` → `billsTransaction()` |
| Commission opérateur | 0,5–1% | config |
| Abonnement pro | 10€/mois | config |

**À brancher** : à chaque paiement de facture, prélever `commissionService.billsTransaction(amount).platform`.

## 10. Recharge crédit (Airtime)
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission opérateur | 3–5% | config |
| Bonus utilisateur | 1–2% cashback | config |
| Marge nette plateforme | 1–3% | `commission.service.ts` → `airtimeRecharge()` |

**À brancher** : à chaque recharge, `commissionService.airtimeRecharge(amount)` et appliquer cashback + part plateforme.

## 11. Assurance
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Commission courtage | 15–25% (défaut 20%) | `commission.service.ts` → `insuranceBrokerage()` |
| Micro-assurance | 20–30% | `insuranceMicro()` |
| Partenariat assureur | 5000–20000€/an | config |
| Renouvellement | Commission sur renouvellement | config |

**À brancher** : à chaque prime payée (souscription/renouvellement), `commissionService.insuranceBrokerage(premium)` ou `insuranceMicro()`.

## 12. Actualités / contenu
| Règle | Taux / Montant | Branché dans |
|-------|----------------|-------------|
| Publicité display | CPM 1–3€ (1000 vues) | config |
| Articles sponsorisés | 50–500€/article | config |
| Abonnement premium | 3€/mois (sans pub) | config |
| Branded content | 500–5000€/campagne | config |

---

## Utilisation dans le code

```ts
import commissionService from './commission.service.js';

// Exemple : commission transport sur une course de 5000 FCFA
const { platform, driver } = commissionService.transportRide(5000);
await platformRevenueService.addRevenue(platform, 'transport', 'Commission course', rideId);

// Exemple : commission billetterie (déjà branché dans event.service)
const { platform, organizer } = commissionService.ticketingTicket(payment.amount, event.platform_fee_pct / 100);
```

Tous les montants dans le config et le service sont en **FCFA** sauf indication (€ dans les commentaires).

---

## Frontend (éviter les risques / litiges)

- **Backend = source de vérité** : les montants définitifs sont toujours calculés côté backend au moment du paiement.
- **Affichage avant paiement** : le frontend récupère les mêmes taux et peut afficher les frais estimés pour transparence.

### API publique (lecture seule)

- **GET /api/commissions** — config complète (taux, montants min/max par vertical).
- **GET /api/commissions/calculate?vertical=...&rule=...&amount_fcfa=...** — calcul des parts (plateforme, vendeur, etc.) pour un montant donné.

### Frontend

- **Client** : `api.commissions.getConfig()`, `api.commissions.calculate(vertical, rule, amountFcfa, deliveryFeeFcfa?)`.
- **Utils** : `@/utils/commissions` — `getCommissionConfig()`, `getCommissionBreakdown()`, `formatCommissionRate()`, `formatFcfa()`.
- **Composant** : `<CommissionNotice vertical="marketplace" amountFcfa={subtotal} rule="seller" compact />` pour afficher le taux et, si `amountFcfa` est fourni, les frais estimés (données backend).

Pages où la notice est affichée : **Cart**, **Checkout** (marketplace), **Ticketing**, **Transport**, **FoodDelivery**, **Utilities** (bills + airtime), **Insurance**.
