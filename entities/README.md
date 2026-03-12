<!-- CodeRabbit test PR -->
# Entités AfriWonder

Dans AfriWonder, les **entités** ne sont pas des fichiers JSON séparés : elles sont définies dans le schéma **Prisma** du backend. Ce dossier documente le mapping des 150+ entités cibles.

**Source de vérité :** `backend/prisma/schema.prisma`  
**Nombre de modèles :** **183**

---

## SOCIAL & VIDÉO

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Video | Video |
| Comment | Comment |
| Like | Like |
| Follow | Follow |
| Save | Save |
| Story | Story |
| LiveStream | LiveStream |
| Community | Community |
| CommunityMember | CommunityMember |
| Subscription | Subscription |
| SubscriptionTier | SubscriptionTier |
| ViewHistory | ViewHistory |
| Challenge | Challenge |
| Music | Music |
| Playlist | Playlist |
| PlaylistItem | PlaylistItem |
| DirectMessage | DirectMessage |
| Conversation | Conversation |
| Gift | Gift |
| LiveGift | LiveGift (Gift + LiveStream) |
| GiftTransaction | GiftTransaction |
| LiveChat | LiveChat |
| DirectCall | DirectCall |
| VideoAnalytics | VideoAnalytics |

+ LiveViewer, LiveModerationSettings, LiveModerator, LiveLike, LiveAnalytics, LiveTopDonor, CreatorLevel, VideoTip, UserLevel.

---

## MARKETPLACE

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Product | Product |
| ProductVariant | ProductVariant |
| Order | Order |
| OrderItem | OrderItem |
| Cart | Cart |
| CartItem | (OrderItem / Cart relation) |
| Review | Review |
| ProductReview | Review (productId) |
| Seller | User + SellerProfile |
| SellerProfile | SellerProfile |
| SellerWallet | SellerWallet |
| Payment | OrderPayment, Transaction |
| Coupon | Coupon, CouponUsage |
| FlashSale | FlashSale |
| Return | Return |
| Dispute | Dispute |
| Wishlist | Wishlist |
| Address | Address |
| ShippingRate | ShippingRate, Shipping |
| DeliveryTracking | DeliveryTracking |
| Payout | Payout, Withdrawal |
| ProductPromotion | ProductPromotion |
| InventoryLog | InventoryLog |
| CheckoutSession | CheckoutSession |
| CollaboratorRevenue | CollaboratorRevenue |

+ ProductAnalytics, AbandonedCart, SellerReview, Refund, DisputeMessage, OrderInvoice, OrderReview, TrackingEvent, PickupPoint.

---

## SERVICES

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Service | Service |
| ServiceProvider | ServiceProvider |
| ServiceCategory | ServiceCategory |
| ServiceBooking | ServiceBooking |
| ServicePayment | (Transaction / OrderPayment) |
| ServicePayout | ServicePayout |
| ServiceReview | ServiceReview |
| ServiceDispute | ServiceDispute |
| Availability | ServiceAvailability, ServiceUnavailability |

+ (PlatformCommission, ProviderPerformance, BookingChat, ProviderSubscription, LoyaltyPoints, LoyaltyTransaction, LoyaltyReward → LoyaltyProgram, UserLoyalty, etc.)

---

## TRANSPORT

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Ride | Ride |
| Driver | Driver |

---

## FOOD DELIVERY

| Entité cible | Modèle Prisma |
|--------------|----------------|
| FoodOrder | FoodOrder |
| Restaurant | Restaurant |
| MenuItem | MenuItem |

---

## TÉLÉMÉDECINE

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Appointment | Appointment |
| Doctor | Doctor |
| Pharmacy | Pharmacy |

---

## IMMOBILIER

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Property | Property |
| (VisitRequest) | PropertyVisitRequest |

---

## BILLETTERIE

| Entité cible | Modèle Prisma |
|--------------|----------------|
| Ticket | Ticket, EventTicket |
| Event | Event |

+ EventTicketType, TicketLock, EventAttendance, EventPayment, EventLike, EventComment, EventFeaturedPayment, EventChatMessage.

---

## PAIEMENTS & WALLET

| Entité cible | Modèle Prisma |
|--------------|----------------|
| BillPayment | BillPayment |
| AirtimeRecharge | AirtimeRecharge |
| Wallet | Wallet |
| Transaction | Transaction |

+ LedgerEntry, WalletSecurity, ExchangeRate.

---

## ASSURANCE

| Entité cible | Modèle Prisma |
|--------------|----------------|
| InsurancePolicy | InsurancePolicy |
| InsuranceClaim | InsuranceClaim |

---

## ACTUALITÉS & CONTENU

| Entité cible | Modèle Prisma |
|--------------|----------------|
| NewsArticle | NewsArticle |
| Course | Course |
| Enrollment | Enrollment |
| Certificate | Certificate |
| Job | Job |
| JobApplication | JobApplication |
| Campaign | Campaign |
| Contribution | Contribution |
| CivicPetition | CivicPetition |
| PetitionSignature | PetitionSignature |
| LoanRequest | LoanRequest |
| MicroloanContribution | MicroloanContribution |

+ Lesson, CourseReview, CourseWishlist, LoanAgreement, LoanRepayment, CandidateProfile, CompanyProfile, CompanyRating, CandidateRating, SavedJob, ArticleView, ArticleLike, ArticleComment, UserNewsPreference, TrendingArticle, VerifiedSource, NewsPremiumSubscription, PetitionComment, PetitionCommentLike, SavedPetition.

---

## SYSTÈME & ADMIN

| Entité cible | Modèle Prisma |
|--------------|----------------|
| User | User |
| Notification | Notification |
| NotificationPreference | NotificationPreference |
| NotificationLog | NotificationLog |
| Message | Message |
| Report | Report |
| Moderation | Moderation |
| UserBan | UserBan |
| LiveStreamBan | LiveStreamBan |
| UserVerification | UserVerification |
| Badge | Badge |
| UserBadge | UserBadge |
| UserPoints | UserPoints |
| Referral | Referral |
| Analytics | Analytics |
| AuditLog | AuditLog, AdminAuditLog, AuditEvent |
| TranscodingJob | TranscodingJob |
| PlatformSettings | PlatformSettings |
| SupportTicket | SupportTicket |
| FeatureFlag | FeatureFlag |

+ AdminLog, SupportMessage, IdempotencyKey, BlacklistEntry, TransactionFlag, LegalDocument, UserLegalAcceptance, UserCookiePreference, GuestCookieConsent, DataExportRequest, AccountDeletionRequest, SecurityLog, User2FA, SuspiciousActivityAlert, LegalEntityInfo, DataRetentionPolicy, ConsentLog.

---

## Résumé

- **183 modèles** Prisma couvrent et dépassent les **150+ entités** cibles du projet AfriWonder.
- Pour modifier ou étendre le modèle de données, éditer uniquement `backend/prisma/schema.prisma`, puis exécuter `npx prisma generate` et les migrations.
