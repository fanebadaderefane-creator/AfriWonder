# AfriWonder — Grille de couverture QA

> **Règle absolue :** 1 ligne = 1 carte QA. Aucune feature ne peut passer en prod sans être en **OK** ou **BUG (Pn)**.  
> Légende statut : ⬜ non testé · 🟢 OK · 🟠 BUG P1/P2 · 🔴 BUG P0 · 🚧 Coming-Soon / non-implémenté.  
> Les statuts marqués `[static]` proviennent de l'audit automatisé du 2026-04-24 — ils doivent être **re-validés manuellement sur device** avant lancement public.

---

## Légende colonnes
- **#** : numéro de feature (correspond à la liste produit)
- **Feature** : nom fonctionnel
- **Écran frontend** : fichier principal
- **Route backend** : fichier route ou service principal
- **Acteur** : guest / user / creator / seller / admin
- **Statut** : état courant (cf. légende)
- **Notes** : bug connu, P0/P1/P2, ou remarque

---

## 1. Authentification & Compte
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 1 | Inscription e-mail | `app/(auth)/register.tsx` | `auth.routes.ts` | guest | ⬜ | |
| 2 | Inscription téléphone (OTP) | `app/(auth)/register.tsx` | `auth.routes.ts` | guest | ⬜ | |
| 3 | Connexion e-mail | `app/(auth)/login.tsx` | `auth.routes.ts` | guest | ⬜ | |
| 4 | OAuth Google / Apple | `app/(auth)/login.tsx` | `oauthMobileVerify.service.ts` | guest | ⬜ | |
| 5 | Déconnexion + invalidation | (bouton settings) | `accessTokenBlacklist` + `refreshTokenBlacklist` | user | ⬜ | |
| 6 | Mot de passe oublié | `app/(auth)/login.tsx` | `auth.routes.ts` | guest | ⬜ | |
| 7 | Sessions multiples | settings/security | `auth.service.ts` | user | ⬜ | |
| 8 | Onboarding intérêts | `onboarding.tsx`, `interests.tsx` | `me.routes.ts` | user | ⬜ | |
| 9 | KYC | (`verification.routes.ts`) | `verification.service.ts` | user | ⬜ | |
| 10 | Alertes de connexion | `settings/security/*` | `loginAlert.service.ts` | user | ⬜ | |
| 11 | Suppression de compte | settings | `accountDeletion.service.ts` | user | 🟠 [static] | TODO résiduels dans le service |
| 12 | CGU / Privacy accept | `terms.tsx`, `privacy-policy.tsx` | `legal.service.ts` | guest | ⬜ | |
| 13 | Consentement cookies | — | `cookieConsent.service.ts` | all | ⬜ | |
| 14 | Early access | — | `earlyAccess.routes.ts` | guest | ⬜ | |

## 2. Profil
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 15 | Profil self / other | `user/[id].tsx`, `(tabs)/profile.tsx` | `users.routes.ts` | user | ⬜ | |
| 16 | Édition profil | `profile-edit.tsx` | `me.routes.ts` | user | 🔴 [static] | `_layout.tsx` utilise `user.display_name` inexistant |
| 17 | QR profil | `profile-qr.tsx` | `users.routes.ts` | user | ⬜ | |
| 18 | Connexions / abonnés | `profile-connections.tsx` | `friends.routes.ts` | user | 🟠 [static] | query `q` typé `string\|string[]` non normalisé |
| 19 | Badges | `badges-profile.tsx` | `creatorBadges.service.ts` | user | ⬜ | |
| 20 | Comptes bloqués | `settings/blocked-accounts.tsx` | `user.service.ts` | user | 🟠 [static] | Alert 'Error' en anglais |
| 21 | View history | — | `viewHistory.routes.ts` | user | ⬜ | |
| 22 | Saves / Collections | `saved-collections.tsx` | `saves.routes.ts` | user | ⬜ | |
| 23 | Downloads | `downloads.tsx` | — | user | ⬜ | |
| 24 | Wishlist | `wishlist.tsx` | `wishlist.routes.ts` | user | 🚧 [static] | `Alert('Bientôt disponible','marketplace sera activé prochainement')` |

## 3. Social / Feed / Stories
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 25 | Feed principal | `feed.tsx`, `(tabs)/index.tsx` | `feed.routes.ts` + `feedAlgorithm.service.ts` | user | 🟠 [static] | 3 `Alert('Bientôt disponible')` (recherche Moments, édition post) + 8 console.log |
| 26 | Discover / Explore / Friends | `(tabs)/discover.tsx`, `(tabs)/explore.tsx`, `(tabs)/friends.tsx` | `feed.routes.ts` | user | ⬜ | |
| 27 | Stories (création / vue) | `stories.tsx` | `stories.routes.ts` | user | 🟠 [static] | "Stories dédiées arriveront ici bientôt" |
| 28 | Poster | (sheet `feed` + `(tabs)/create.tsx`) | `posts.routes.ts` | user | ⬜ | |
| 29 | Commentaires + réactions | feed + posts | `comments.routes.ts` + `commentReaction.service.ts` | user | ⬜ | |
| 30 | Like / Save / Share | feed | `saves.routes.ts` | user | ⬜ | |
| 31 | Report modal | `src/components/ReportModal.tsx` | `moderation.routes.ts` | user | ⬜ | |
| 32 | Polls | `FeedPollCard.tsx` | `videoPoll.service.ts` | user | ⬜ | |
| 33 | Challenges | `challenges.tsx` | `challenges.routes.ts` | user | ⬜ | |
| 34 | Sound feed | `sound-feed.tsx` | `music.routes.ts` | user | ⬜ | |
| 35 | Recommandations | — | `recommendations.routes.ts` | user | ⬜ | |
| 36 | Modération contenu | — | `moderation.service.ts` | admin | ⬜ | |

## 4. Vidéo / Watch / Playlists
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 37 | Lecteur vidéo (locked) | feed vertical | `videos.routes.ts` | user | ⬜ | **règle .cursor/rules/video-player-locked — ne PAS modifier** |
| 38 | Autoplay selon settings | `useFeedAutoplayFromSettings.ts` | — | user | ⬜ | |
| 39 | Thumbnails | utils | `videoThumbnail.service.ts` | user | ⬜ | |
| 40 | Transcoding / renditions | — | `transcoding.service.ts`, `videoLowQualityRendition.service.ts`, `videoCompatTranscode.service.ts` | system | ⬜ | |
| 41 | Sous-titres | — | `subtitle.service.ts` | user | ⬜ | |
| 42 | Vues qualifiées | — | `qualifiedView.service.ts` | system | 🔴 [static] | `video.service.ts:227,243` — `limitValue` UNDEFINED (crash) |
| 43 | Watch | `watch/[id].tsx` | `videos.routes.ts` | user | ⬜ | |
| 44 | Playlists | `playlists/index.tsx`, `playlist/[id].tsx` | `playlists.routes.ts` | user | ⬜ | |
| 45 | Défis vidéo | — | `videoChallenge.service.ts` | user | ⬜ | |
| 46 | Tip vidéo | `tip.tsx` | `videoTip.service.ts` | user | ⬜ | |

## 5. Live
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 47 | Démarrer live | `live/start.tsx`, `live/stream.tsx` | `live.routes.ts` | creator | ⬜ | |
| 48 | Rejoindre live | `live/[id].tsx`, `live/index.tsx` | `live.routes.ts` | user | ⬜ | |
| 49 | Analytics live | `live/analytics/[id].tsx` | `live.service.ts` | creator | ⬜ | |
| 50 | Replay | `live/replay.tsx` | `liveRecording.service.ts` | user | ⬜ | |
| 51 | Gifts live | `live/gifts.tsx` | `gifts.routes.ts` | user | ⬜ | |
| 52 | Live STT | — | `liveStt.service.ts` | system | ⬜ | |
| 53 | Enregistrement | — | `liveRecording.service.ts` | system | ⬜ | |

## 6. Messagerie / Appels
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 54 | Conversations list | `messages/index.tsx` | `messages.routes.ts` | user | 🟠 [static] | 3 console.log à nettoyer |
| 55 | Conversation 1-1 | `messages/[id].tsx` | `messages.routes.ts` | user | 🔴 [static] | `message.service.ts` 10 erreurs type dm_request |
| 56 | Nouveau groupe | `messages/new-group.tsx` | `messageGroup.service.ts` | user | ⬜ | |
| 57 | Demandes de message | `messages/requests.tsx`, `MessageRequestDetailPane.tsx` | `messages.routes.ts` | user | 🔴 [static] | `services.routes.ts:147` dm_request narrow cassé |
| 58 | Appel 1-1 (audio/vidéo) | `messages/call.tsx` | `calls.routes.ts` | user | 🚧 [static] | `callsOnNative` désactivé sur natif tant que `react-native-webrtc` absent |
| 59 | Appel de groupe | — | `groupCalls.routes.ts` | user | ⬜ | |
| 60 | Historique appels | — | `meCallHistory.service.ts` | user | ⬜ | |
| 61 | E2EE | `e2eeMobileService.ts` | `e2ee.service.ts` | user | ⬜ | |
| 62 | Stickers | — | `stickers.routes.ts` | user | ⬜ | |
| 63 | Partage média dans chat | `messages/[id].tsx` | — | user | ⬜ | |

## 7. Paiements / Portefeuille
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 64 | Wallet | `wallet/index.tsx` | `wallet.routes.ts` | user | 🟠 [static] | 1 console.log |
| 65 | Recharge wallet | `wallet/recharge.tsx` | `wallet.service.ts` | user | ⬜ | |
| 66 | Transfert P2P | `wallet/transfer.tsx` | `wallet.routes.ts` | user | 🚧 [static] | Alert 'Fonction à venir' bien que flag `walletP2PTransfer=true` par défaut — à clarifier |
| 67 | Demande de paiement | — | `paymentRequest.routes.ts` | user | ⬜ | |
| 68 | Withdraw | `creator/withdraw.tsx` | `withdrawals.routes.ts` | creator | 🟠 [static] | TODO résiduels dans `withdrawal.service.ts` |
| 69 | Micro-crédit | `wallet/microcredit.tsx` | `microcredit.service.ts` | user | ⬜ | |
| 70 | Carte virtuelle | — | `virtualCard.service.ts` | user | ⬜ | |
| 71 | Transferts internationaux | — | `internationalTransfer.service.ts` | user | ⬜ | |
| 72 | Taux de change | — | `exchangeRates.routes.ts` | system | ⬜ | |
| 73 | Escrow | — | `escrow.service.ts` | system | ⬜ | |
| 74 | Sécurité wallet (PIN) | — | `walletSecurity.service.ts` | user | ⬜ | |
| 75 | AML / Risk / Fraud | — | `aml.service.ts`, `riskEngine.service.ts`, `fraudCheck.service.ts` | system | ⬜ | |
| 76 | Orange Money | `checkout/orange-money.tsx` | `payments.routes.ts` | user | ⬜ | **tester en sandbox + prod réel** |
| 77 | Wave | `checkout/wave.tsx` | `payments.routes.ts` | user | ⬜ | **tester en sandbox + prod réel** |
| 78 | Paiement carte Stripe | `payments/index.tsx` | `payments.routes.ts` | user | ⬜ | Flag `stripe=true` — clés prod requises |
| 79 | Preauth | — | `paymentPreauth.service.ts` | system | ⬜ | |
| 80 | IAP pièces | `wallet/coins.tsx` | `coins.routes.ts` | user | 🟠 [static] | `coinIapPurchase.native.ts:139` param `e` implicit any |
| 81 | Coins packages admin | `(admin)/*` | `coinPackageAdmin.service.ts` | admin | ⬜ | |
| 82 | Cashback | `africoin/cashback.tsx` | `coins.service.ts` | user | 🚧 [static] | "catalogue à venir" |
| 83 | Invoices | — | `invoice.service.ts` | user | ⬜ | |
| 84 | Refunds | — | `refunds.routes.ts` | user | ⬜ | |
| 85 | Disputes paiement | — | `disputes.routes.ts` | user | ⬜ | |

## 8. AfriCoin & Loyalty
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 86 | Coins | `africoin/coins.tsx` | `coins.routes.ts` | user | 🟠 [static] | `Alert('Notifications','Bientôt synchronisé...')` |
| 87 | Parrainage AfriCoin | `africoin/referral.tsx`, `africoin/referral-friends.tsx` | `referrals.routes.ts` | user | ⬜ | |
| 88 | Loyalty | `loyalty.tsx` | `loyalty.routes.ts` | user | ⬜ | |
| 89 | Support AfriCoin | `africoin/support.tsx` | `support.routes.ts` | user | ⬜ | |
| 90 | Order summary | `africoin/order-summary.tsx` | — | user | ⬜ | |

## 9. Marketplace
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 91 | Market home | `(tabs)/market.tsx` | `products.routes.ts` | user | ⬜ | |
| 92 | Fiche produit | `product/[id].tsx` | `products.routes.ts` | user | ⬜ | |
| 93 | Panier | `cart/index.tsx` | `cart.routes.ts` | user | 🔴 [static] | hooks conditionnels (P0-1) |
| 94 | Checkout | `checkout/index.tsx` | `orders.routes.ts` | user | 🔴 [static] | hooks conditionnels (P0-1) |
| 95 | Commandes | `orders/index.tsx`, `orders/[id].tsx` | `orders.routes.ts` | user | 🚧 [static] | 2 ComingSoon |
| 96 | Avis produit | — | `reviews.routes.ts` | user | ⬜ | |
| 97 | Avis vendeur | — | `seller-reviews.routes.ts`, `sellerReview.service.ts` | user | ⬜ | |
| 98 | Questions produit | — | `product-question.service.ts` | user | ⬜ | |
| 99 | Retours | — | `returns.routes.ts`, `return.service.ts` | user | ⬜ | |
| 100 | Disputes commande | — | `dispute.service.ts` | user | ⬜ | |
| 101 | Shipments | — | `shipments.routes.ts`, `shipment.service.ts` | user | ⬜ | |
| 102 | Adresses | `settings/addresses.tsx` | `addresses.routes.ts` | user | ⬜ | |
| 103 | Group buy | — | `groupBuy.routes.ts`, `groupBuy.service.ts` | user | ⬜ | |
| 104 | Enchères | — | `auction.service.ts` | user | ⬜ | |
| 105 | Marketplace subscription | — | `marketplaceSubscription.service.ts` | seller | ⬜ | |
| 106 | Seller dashboard | `seller/index.tsx` | `seller.routes.ts` | seller | ⬜ | |
| 107 | Seller payouts | — | `service-payouts.routes.ts` | seller | 🟠 [static] | TODO `service-payout.service.ts` |
| 108 | Business page | — | `businessPage.routes.ts`, `businessPage.service.ts` | seller | ⬜ | |

## 10. Services locaux
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 109 | Transport / VTC | `services/transport.tsx` | `rides.routes.ts` | user | 🔴 [static] | hooks conditionnels + ComingSoon |
| 110 | Covoiturage | `services/covoiturage.tsx` | `rideShare.routes.ts` | user | 🔴 [static] | idem |
| 111 | Location véhicule | `services/vehicle-rental.tsx` | `vehicle-rental.routes.ts` | user | 🔴 [static] | idem |
| 112 | Food delivery | `services/food.tsx` | `foodOrders.routes.ts` + `restaurants.routes.ts` | user | 🔴 [static] | idem |
| 113 | Voyage | `services/voyage.tsx` | `travel.routes.ts` | user | 🔴 [static] | idem |
| 114 | Immobilier | `services/realestate.tsx` | `properties.routes.ts` | user | 🔴 [static] | idem |
| 115 | Santé | `services/health.tsx` | `doctors.routes.ts` + `pharmacies.routes.ts` | user | 🔴 [static] | idem |
| 116 | Événements | `services/events.tsx` | `events.routes.ts` + `tickets.routes.ts` | user | 🔴 [static] | idem |
| 117 | Emplois | `services/jobs.tsx` | `job.service.ts` | user | 🔴 [static] | idem |
| 118 | Assurance | `services/insurance.tsx` | `insurance.routes.ts` | user | ⬜ | |
| 119 | Garde d'enfants | `services/childcare.tsx` | `child-care.routes.ts` | user | 🔴 [static] | hooks + Prisma `category` cassé |
| 120 | Services publics | — | `publicServices.routes.ts` | user | ⬜ | |
| 121 | Rendez-vous | — | `appointments.routes.ts` | user | ⬜ | |
| 122 | Civic | `civic.tsx` | `civic.routes.ts`, `civic.service.ts` | user | ⬜ | |
| 123 | Bookings génériques | — | `bookings.routes.ts`, `booking.service.ts` | user | 🟠 [static] | TODO résiduels |
| 124 | Matching | — | `matching.routes.ts` | user | ⬜ | |
| 125 | Avis / litiges service | — | `service-review.service.ts`, `service-dispute.service.ts` | user | 🟠 [static] | TODO résiduels |

## 11. Recharges & Factures
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 126 | Airtime | `airtime.tsx` | `airtime.routes.ts` | user | ⬜ | |
| 127 | Bills | `bills.tsx` | `bills.routes.ts` | user | ⬜ | |

## 12. Crowdfunding
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 128 | Home crowdfunding | `crowdfunding/index.tsx` | `crowdfunding.routes.ts` | user | 🔴 [static] | `.image` vs `.images` (images cassées) |
| 129 | Créer campagne | `crowdfunding/create.tsx` | `crowdfunding.service.ts` | user | ⬜ | |
| 130 | Contribuer | `crowdfunding/contribute.tsx` | `crowdfunding.service.ts` | user | 🔴 [static] | hooks conditionnels + ComingSoon |
| 131 | Détail campagne | `crowdfunding/[id].tsx` | `crowdfunding.service.ts` | user | 🟠 [static] | texte placeholder "plus de details a venir bientot..." |
| 132 | Dashboard créateur | `crowdfunding/dashboard.tsx` | `crowdfunding.service.ts` | creator | ⬜ | |
| 133 | Historique | `crowdfunding/history.tsx` | `crowdfunding.service.ts` | user | ⬜ | |
| 134 | Dons plateforme | — | `platformDonations.routes.ts` | user | ⬜ | |

## 13. Social graph
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 135 | Communities | `communities/index.tsx` | `communities.routes.ts` | user | ⬜ | |
| 136 | Find friends | `find-friends.tsx` | `friends.routes.ts` | user | 🔴 [static] | 2 erreurs TS styles + query `string\|string[]` |
| 137 | Sync contacts | `sync-contacts.tsx` | `friends.routes.ts` | user | 🔴 [static] | erreur TS style web |
| 138 | Suggest creators | `suggest-creators.tsx` | `creators.routes.ts` | user | 🔴 [static] | erreur TS `accessibilityLabel` |
| 139 | Connect now | `connect-now.tsx` | — | user | ⬜ | |
| 140 | Amis (tab) | `(tabs)/friends.tsx` | `friends.routes.ts` | user | ⬜ | |
| 141 | Referrals | `referrals.tsx` | `referrals.routes.ts` | user | ⬜ | |

## 14. News / Learn / Mini-apps / AI
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 142 | News | `news/index.tsx`, `news/[id].tsx` | `news.routes.ts` | user | 🚧 [static] | ComingSoon |
| 143 | Cours | `courses/index.tsx`, `courses/[id].tsx` | `courses.routes.ts` | user | 🚧 [static] | ComingSoon + "programme bientôt détaillé" |
| 144 | Certificats | — | `certificates.routes.ts` | user | ⬜ | |
| 145 | Mini-apps | `miniapps.tsx` | `miniApps.routes.ts` | user | ⬜ | |
| 146 | Map places | — | `mapPlaces.routes.ts` | user | ⬜ | |
| 147 | Assistant | `assistant.tsx` | `aiEngine.routes.ts` | user | ⬜ | |
| 148 | AI Engine | — | `aiEngine.routes.ts`, `ai.routes.ts` | system | ⬜ | |
| 149 | Chatbot | — | `chatbot.routes.ts` | user | ⬜ | |
| 150 | Traduction | — | `translate.routes.ts` | user | ⬜ | |

## 15. Créateur / Monétisation
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 151 | Creator dashboard | `creator/_layout.tsx` | `creatorDashboard.routes.ts` | creator | ⬜ | |
| 152 | Earnings | `creator/earnings.tsx` | `creatorDashboard.service.ts` | creator | ⬜ | |
| 153 | Revenue share | `creator/revenue-share.tsx` | `collaboratorRevenue.service.ts` | creator | ⬜ | |
| 154 | Withdraw créateur | `creator/withdraw.tsx` | `withdrawals.routes.ts` | creator | ⬜ | |
| 155 | Ads créateur | `creator/ads.tsx` | `ads.routes.ts` | creator | ⬜ | |
| 156 | Brand deals | `brand-deals.tsx` | `brandDeals.routes.ts` | creator | ⬜ | |
| 157 | Abonnements | `subscriptions.tsx` | `subscriptions.routes.ts`, `creatorSubscription.routes.ts` | user | ⬜ | |
| 158 | Support créateurs | — | `creatorSupport.routes.ts` | creator | ⬜ | |
| 159 | Contrats / Fraude / Badges | — | `creatorContract.service.ts`, `creatorFraud.service.ts`, `creatorBadges.service.ts` | admin | ⬜ | |
| 160 | Viral bonus | — | `viralBonus.routes.ts` | creator | ⬜ | |
| 161 | Commissions | — | `commissions.routes.ts`, `commission.service.ts` | admin | ⬜ | |
| 162 | Gifts | — | `gifts.routes.ts`, `gift.service.ts` | user | ⬜ | |
| 163 | Media kit | — | `creatorMediaKit.service.ts` | creator | ⬜ | |

## 16. Gamification
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 164 | Hub gamification | `gamification-hub.tsx` | `gamification.routes.ts` | user | ⬜ | |
| 165 | Leaderboard | `leaderboard.tsx` | `leaderboard.routes.ts` | user | ⬜ | |
| 166 | Daily missions | — | `dailyMissions.service.ts` | user | ⬜ | |

## 17. Notifications
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 167 | Centre notif | `notifications/index.tsx` | `notifications.routes.ts` | user | ⬜ | |
| 168 | Push | `notificationService.ts` | `notification.service.ts` | user | ⬜ | |
| 169 | Préférences | `settings/notifications.tsx` | `me.routes.ts` | user | ⬜ | |

## 18. Recherche
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 170 | Recherche globale | `search.tsx` | `search.routes.ts`, `search.service.ts` | user | ⬜ | |
| 171 | Filtres | — | `filters.routes.ts` | user | ⬜ | |
| 172 | Recommandations | — | `recommendation.service.ts` | system | ⬜ | |

## 19. Settings
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 173 | Settings racine | `settings/index.tsx` | `me.routes.ts` | user | ⬜ | |
| 174 | Langue | `settings/language.tsx` | — | user | ⬜ | |
| 175 | Thème / Display | `settings/display.tsx` | — | user | ⬜ | |
| 176 | Accessibility | `settings/accessibility.tsx` | — | user | ⬜ | |
| 177 | Data saver | `settings/data-saver.tsx` | — | user | ⬜ | |
| 178 | Free up space | `settings/free-up-space.tsx` | — | user | 🟠 [static] | Alert 'Error' en anglais |
| 179 | Content preferences | `settings/content-preferences.tsx` | `me.routes.ts` | user | ⬜ | |
| 180 | Time wellbeing | `settings/time-wellbeing.tsx` | — | user | 🟢 lint | warning `View` unused |
| 181 | Family pairing | `settings/family-pairing.tsx` | — | user | ⬜ | |
| 182 | Contacts / location | `settings/contacts-location.tsx` | — | user | ⬜ | |
| 183 | Audience controls | `settings/audience-controls.tsx` | `privacy.routes.ts` | user | ⬜ | |
| 184 | Share profile | `settings/share-profile.tsx` | — | user | 🟠 [static] | Alert 'Error' en anglais |
| 185 | Blocked accounts | `settings/blocked-accounts.tsx` | — | user | 🟠 [static] | Alert 'Error' en anglais |
| 186 | Addresses | `settings/addresses.tsx` | `addresses.routes.ts` | user | ⬜ | |
| 187 | Privacy index | `settings/privacy.tsx` | `privacy.routes.ts` | user | ⬜ | |
| 188 | Privacy: activity status | `settings/privacy/activity-status.tsx` | `privacy.service.ts` | user | ⬜ | |
| 189 | Privacy: following list | `settings/privacy/following-list.tsx` | `privacy.service.ts` | user | ⬜ | |
| 190 | Privacy: liked videos | `settings/privacy/liked-videos.tsx` | `privacy.service.ts` | user | ⬜ | |
| 191 | Privacy: comments | `settings/privacy/comments.tsx` | `privacy.service.ts` | user | ⬜ | |
| 192 | Privacy: mentions | `settings/privacy/mentions.tsx` | `privacy.service.ts` | user | ⬜ | |
| 193 | Privacy: DM | `settings/privacy/direct-messages.tsx` | `privacy.service.ts` | user | ⬜ | |
| 194 | Security index | `settings/security/index.tsx` | `auth.service.ts` | user | ⬜ | |
| 195 | Security: password | `settings/security/password.tsx` | `auth.routes.ts` | user | ⬜ | |
| 196 | Security: 2FA | `settings/security/two-factor.tsx` | `auth.service.ts` | user | ⬜ | |
| 197 | Notifications (settings) | `settings/notifications.tsx` | — | user | ⬜ | |

## 20. Admin / Modération
| # | Feature | Écran | Route | Acteur | Statut | Notes |
|---|---|---|---|---|---|---|
| 198 | Admin dashboard | `admin-dashboard.tsx`, `(admin)/index.tsx` | `admin.routes.ts` | admin | 🔴 [static] | `admin.routes.ts:918` null/undefined |
| 199 | Admin users | `(admin)/users.tsx` | `admin.routes.ts` | admin | ⬜ | |
| 200 | Admin creators | `(admin)/creators.tsx` | `admin.routes.ts` | admin | ⬜ | |
| 201 | Admin lives | `(admin)/lives.tsx` | `admin.routes.ts` | admin | ⬜ | |
| 202 | Admin transactions | `(admin)/transactions.tsx` | `adminFinance.service.ts` | admin | ⬜ | |
| 203 | Admin reports | `(admin)/reports.tsx` | `moderation.routes.ts` | admin | ⬜ | |
| 204 | Admin settings | `(admin)/settings.tsx`, `admin-settings.tsx` | — | admin | ⬜ | |
| 205 | Modération | `(admin)/moderation.tsx` | `moderation.service.ts`, `moderationSanctions.service.ts` | admin | ⬜ | |
| 206 | Audit trail | — | `adminAudit.service.ts`, `auditTrail.service.ts` | admin | ⬜ | |
| 207 | Platform control / flags | — | `platformControl.service.ts`, `featureFlag.service.ts` | admin | ⬜ | |
| 208 | Platform health | — | `platformHealth.service.ts` | admin | ⬜ | |

## 21. Infrastructure transverse
| # | Feature | Zone | Statut | Notes |
|---|---|---|---|---|
| 209 | R2 multipart upload | `r2Multipart.service.ts` | ⬜ | |
| 210 | Uploads | `upload.routes.ts` | ⬜ | |
| 211 | Proxy routes | `proxy.routes.ts` | 🟠 [static] | 1 console.log |
| 212 | Public API | `publicApi.routes.ts` | ⬜ | |
| 213 | Developer API | `developer.routes.ts` | ⬜ | |
| 214 | Prometheus / HTTP metrics | `prometheusMetrics.service.ts`, `httpMetrics.service.ts` | 🟢 | |
| 215 | Error monitoring Sentry | `@sentry/react-native` + `@sentry/node` | 🟢 | |
| 216 | Backup | `backup.service.ts` | ⬜ | |
| 217 | Legal | `legal.routes.ts`, `legal.service.ts` | 🟠 [static] | TODO résiduels |
| 218 | Data protection | `data-protection.tsx`, `dataExport.service.ts` | 🟠 [static] | TODO résiduels |
| 219 | FAQ / Support | `faq.tsx`, `support-page.tsx`, `support.routes.ts`, `supportTicket.service.ts` | ⬜ | |
| 220 | About / Terms / Privacy | `about.tsx`, `terms.tsx`, `privacy-policy.tsx` | ⬜ | |
| 221 | PWA / Web | `+html.tsx`, `vercel.json` | ⬜ | |
| 222 | Menu plus | `menu-plus.tsx` | ⬜ | |
| 223 | Onboarding | `onboarding.tsx`, `interests.tsx` | ⬜ | |
| 224 | Not found | `+not-found.tsx` | ⬜ | |

---

## Résumé des statuts initiaux

| Statut | Count |
|---|---|
| 🔴 P0 bloquant | 17 |
| 🟠 P1/P2 connus | 16 |
| 🚧 Coming Soon / partiel | 13 |
| 🟢 OK (static only) | 3 |
| ⬜ Non testé (à faire manuellement) | 175 |
| **Total** | **224** |

**≥ 175 cartes nécessitent un test manuel** sur device Android réel avant GO. Aucune ne doit rester ⬜ au moment du release.
