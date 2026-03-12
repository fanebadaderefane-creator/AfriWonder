# AfriWonder — PWA vs React Native Gap Report

## TASK 1 — PWA Entry Points and Features

### 1.1 Routes / Pages (from `src/pages.config.js` + `src/App.jsx`)

Routes are `/${pageName}` (e.g. `/Home`, `/Profile`). Main page: **Home**.

| Page Key | Route |
|----------|--------|
| About | /About |
| Achievements | /Achievements |
| AddProduct | /AddProduct |
| AdvertiserDashboard | /AdvertiserDashboard |
| AdvertiserRegistration | /AdvertiserRegistration |
| BecomeSeller | /BecomeSeller |
| AddService | /AddService |
| Addresses | /Addresses |
| AdminDashboard | /AdminDashboard |
| AdminPage | /AdminPage |
| Analytics | /Analytics |
| ArticleDetails | /ArticleDetails |
| BadgesProfile | /BadgesProfile |
| CampaignDetails | /CampaignDetails |
| Cart | /Cart |
| Certificates | /Certificates |
| Challenges | /Challenges |
| CandidateProfile | /CandidateProfile |
| CompanyProfile | /CompanyProfile |
| Chat | /Chat |
| Checkout | /Checkout |
| Civic | /Civic |
| CivicCreatorDashboard | /CivicCreatorDashboard |
| Communities | /Communities |
| CommunityDetails | /CommunityDetails |
| CourseDetails | /CourseDetails |
| Courses | /Courses |
| Create | /Create |
| CreateCampaign | /CreateCampaign |
| CreateAdCampaign | /CreateAdCampaign |
| CreateCommunity | /CreateCommunity |
| CreateCourse | /CreateCourse |
| CreateEvent | /CreateEvent |
| CreatePetition | /CreatePetition |
| CreatorTools | /CreatorTools |
| Crowdfunding | /Crowdfunding |
| DirectCall | /DirectCall |
| DirectMessage | /DirectMessage |
| Discover | /Discover |
| DisputeCenter | /DisputeCenter |
| FAQ | /FAQ |
| Favorites | /Favorites |
| Formations | /Formations |
| Health | /Health |
| Messages | /Messages (MaliConnect) |
| Downloads | /Downloads |
| EditVideo | /EditVideo |
| EditProduct | /EditProduct |
| EventDetails | /EventDetails |
| EventOrganizerDashboard | /EventOrganizerDashboard |
| Events | /Events |
| Help | /Help |
| Home | /Home (main) |
| Inbox | /Inbox |
| InstructorDashboard | /InstructorDashboard |
| JobDetails | /JobDetails |
| Jobs | /Jobs |
| JobsEmployerDashboard | /JobsEmployerDashboard |
| Language | /Language |
| Leaderboard | /Leaderboard |
| Live | /Live |
| LiveStream | /LiveStream |
| LiveView | /LiveView |
| Lives | /Lives |
| LoanDetails | /LoanDetails |
| Marketplace | /Marketplace |
| MatchingCenter | /MatchingCenter |
| MarketplaceMap | /MarketplaceMap |
| Microcredit | /Microcredit |
| MobileMoneyPayment | /MobileMoneyPayment |
| ModerationDashboard | /ModerationDashboard |
| MyEventTickets | /MyEventTickets |
| News | /News |
| NotificationCenter | /NotificationCenter |
| NotificationPreferences | /NotificationPreferences |
| NotificationSettings | /NotificationSettings |
| Notifications | /Notifications |
| Offline | /Offline |
| OrderTracking | /OrderTracking |
| Orders | /Orders |
| OrderDispute | /OrderDispute |
| OrderReview | /OrderReview |
| PetitionDetails | /PetitionDetails |
| Playlists | /Playlists |
| PublishNews | /PublishNews |
| PostJob | /PostJob |
| Product | /Product |
| Profile | /Profile |
| QRCode | /QRCode |
| Referrals | /Referrals |
| RechargeWallet | /RechargeWallet |
| RequestLoan | /RequestLoan |
| Search | /Search |
| SellerDashboard | /SellerDashboard |
| SellerOrders | /SellerOrders |
| SellerProfile | /SellerProfile |
| SellerSubscription | /SellerSubscription |
| SellerPromotions | /SellerPromotions |
| SellerStorefront | /SellerStorefront |
| SellerWallet | /SellerWallet |
| ServiceDetails | /ServiceDetails |
| ServiceBooking | /ServiceBooking |
| Bookings | /Bookings |
| BookingDetails | /BookingDetails |
| Providers | /Providers |
| ProviderProfile | /ProviderProfile |
| BecomeProvider | /BecomeProvider |
| BecomeTrainer | /BecomeTrainer |
| ProviderDashboard | /ProviderDashboard |
| Settings | /Settings |
| ShareOffline | /ShareOffline |
| StartLive | /StartLive |
| Stories | /Stories |
| Support | /Support |
| UserVerification | /UserVerification |
| VerifyCertificate | /VerifyCertificate |
| VideoView | /VideoView |
| Wallet | /Wallet |
| Wishlist | /Wishlist |
| PrivacyPolicy | /PrivacyPolicy |
| DataProtection | /DataProtection |
| PrivacySettings | /PrivacySettings |
| TermsOfService | /TermsOfService |
| Landing | /Landing, / |
| Transport | /Transport |
| FoodDelivery | /FoodDelivery |
| Utilities | /Utilities |
| Telemedicine | /Telemedicine |
| RealEstate | /RealEstate |
| Insurance | /Insurance |
| Ticketing | /Ticketing |
| RideHistory | /RideHistory |
| BecomeDriver | /BecomeDriver |
| DriverDashboard | /DriverDashboard |
| RestaurantMenu | /RestaurantMenu |
| TicketDetails | /TicketDetails |
| PropertyDetails | /PropertyDetails |
| GamificationHub | /GamificationHub |
| ProjectPresentation | /ProjectPresentation |
| DeveloperPortal | /DeveloperPortal |
| DeveloperGuide | /DeveloperGuide |
| ComingSoon | /ComingSoon |
| MiniAppsStore | /MiniAppsStore |
| MiniAppDetails | /MiniAppDetails |
| DeveloperConsole | /DeveloperConsole |
| DeveloperRevenue | /DeveloperRevenue |
| DeveloperSubscription | /DeveloperSubscription |
| AppBoost | /AppBoost |

**Note:** `createPageUrl('PlaylistView')` is used in code but **PlaylistView** is not in `pages.config.js` (likely missing or embedded elsewhere).

---

### 1.2 Main Components

**`src/components/`** (selected; full tree has 200+ files):

- **Navigation:** `TopHeader.jsx`, `BottomNav.jsx`, `MenuPlus.jsx`
- **Video:** `VideoCard.jsx`, `CommentSheet.jsx`, `ShareSheet.jsx`, `SubtitleGenerator.jsx`, `VideoExport.jsx`, `VideoFrameThumbnail.jsx`, `FeaturedVideoSelector.jsx`, `VideoEditor.jsx`, `AdCard.jsx`, `TipModal.jsx`
- **Live:** `LiveAnalytics.jsx`, `LiveReplayPlayer.jsx`, `GiftPurchaseModal.jsx`, `GiftSelector.jsx`, `AdvancedGiftAnimation.jsx`
- **Profile:** `ProfileHeader.jsx`, `FollowersModal.jsx`
- **Marketplace:** `FlashSaleCard.jsx`, `AdvancedFilters.jsx`, `CouponApplier.jsx`, `CurrencySelector.jsx`, `ReturnForm.jsx`
- **Admin:** `OverviewPanel.jsx`, `ModerationPanel.jsx`, `AnalyticsPanel.jsx`, `FinancePanel.jsx`, `AdsCampaignsPanel.jsx`, `LogisticsPanel.jsx`, `UsersPanel.jsx`, `VerificationsPanel.jsx`, `MaliConnectPanel.jsx`, `EarlyAccessPanel.jsx`
- **Administrateur:** `PaymentsTable.jsx`, `SubscriptionPlansManager.jsx`, `FeaturedProviderManager.jsx`, `CrossModuleSearch.jsx`, `NotificationCenter.jsx`
- **Common:** `OfflineIndicator.jsx`, `OfflineBanner.jsx`, `SlowConnectionBanner.jsx`, `PageLoader.jsx`, `TranslationProvider.jsx`, `GamificationInitializer.jsx`, `RecommendationEngine.jsx`, `PushNotificationService.jsx`, `ImageOptimizer.jsx`, `VirtualScroller.jsx`, `AfriWonderLogo.jsx`, `CookieBanner.jsx`
- **UI (shadcn-style):** `button`, `input`, `dialog`, `tabs`, `card`, `avatar`, `toast`, `sonner`, `form`, `select`, `table`, `chart`, etc.
- **Maison/Landing:** `HeroSection.jsx`, `CategoryGrid.jsx`, `FeaturedProviders.jsx`
- **Call:** `IncomingCallListener.jsx`
- **Realtime:** `useWebSocket.jsx`
- **Creator:** `CreatorMonetizationDashboard.jsx`, `BulkUploadManager.jsx`
- **Gamification:** `UserLevelBadge.jsx`
- **Payment:** `OrangeMoneyIntegration.jsx`
- **Credit:** `CreditScoringModel.jsx`
- **Notifications:** `NotificationCenter.jsx`, `NotificationPreferences.jsx`

**`src/pages/`** — Each key in `PAGES` above corresponds to a page component in `src/pages/` (e.g. `Home.jsx`, `Profile.jsx`, `Create.jsx`).

---

### 1.3 API Usage (expressClient) — Endpoints Used Across the PWA

The PWA uses `api` from `src/api/expressClient.js`. Namespaces and typical usage:

| Namespace | Endpoints / methods used in app |
|-----------|----------------------------------|
| **api.get/post/put/patch/delete** | Raw delegation for non-standard routes |
| **platform** | getFeatureFlags, getConfig, getStats |
| **earlyAccess** | getConfig, joinWaitlist, setMaxUsers, setMaxMonetizedCreators, getWaitlist |
| **auth** | login, register, me, logout, updateMe |
| **videos** | list, getById, create, update, delete, like, comment, getComments, share, recordView, tip, tipWithWallet |
| **feed** | list |
| **ads** | recordImpression, recordClick, reportAd, getPricing, getCampaigns, getCampaignStats, updateCampaign, deleteCampaign, createCampaign, addCreative, submitCampaign, getPendingCampaigns, getAdminCampaigns, approveCampaign, rejectCampaign |
| **creatorSupport** | support, getStats |
| **creatorDashboard** | getDashboard, requestMonetization |
| **referrals** | getStats, getCode |
| **viralBonuses** | getPending, pay |
| **creatorSubscription** | getTiers, subscribe, getMySubscription, getCreatorSubscription |
| **users** | list, getById, update, getFollowers, getFollowing, toggleFollow, toggleWonder, getWonderers, getStats, getLikedVideos |
| **products** | list, getSuggestions, getHighlights, getRecommendations, getNearby, getById, create, update, delete, updateStock, getQuestions, askQuestion, answerQuestion |
| **cart** | get, add, remove, update, clear, applyCoupon, getBreakdown |
| **commissions** | getConfig, calculate, getRates, convert, setRate |
| **wallet** | getMe, create, update, subscribe, getActive |
| **sellerSubscription** | listBySeller, create, update, delete |
| **support** | createTicket, … (tickets, FAQs, etc.) |
| **orders** | (full CRUD, tracking, disputes, etc.) |
| **upload** | image, video |
| **saves** | list, toggle (used as “saved” videos) |
| **notifications** | list, markAsRead, markAllAsRead |
| **gamification** | (levels, badges, challenges, leaderboard) |
| **live** | getById, getStreamToken, joinViewer, leaveViewer, heartbeat, sendChatMessage, sendTip, sendGift, like, reaction, subscribeToCreator, report, ban, getPolls, votePoll, getWallet, getChapters, exportCreatorAnalytics, … |

(Exact method names can be read from `expressClient.js`; the table above reflects the main areas used in `src/`.)

---

## TASK 2 — Mobile (React Native) Screens and Features

### 2.1 Screens in `mobile-afriwonder/src/screens/`

| Screen file | Purpose |
|-------------|---------|
| AuthScreen.js | Login / auth |
| HomeScreen.js | Vertical feed (Home tab) |
| DiscoverScreen.js | Discover tab |
| CreateScreen.js | Create / upload video (Create tab) |
| LivesScreen.js | Live list (Lives tab) |
| ProfileScreen.js | Own profile (Profile tab) |
| SearchScreen.js | Search (stack) |
| NotificationsScreen.js | Notifications (stack) |
| VideoViewScreen.js | Single video view (stack) |
| ProfileUserScreen.js | Other user profile (stack) |
| CommentsScreen.js | Comments modal (stack, transparent) |
| SupportScreen.js | Support (stack) |
| StartLiveScreen.js | Start a live (stack) |
| LiveStreamScreen.js | Host live stream (stack) |
| LiveViewScreen.js | Watch live (stack) |
| WalletScreen.js | Wallet (stack) |

---

### 2.2 Navigation

**`App.js`** (root):

- **Not logged in:** single screen `Auth` (AuthScreen).
- **Logged in:** stack navigator with:
  - **App** (MainTabs) as main stack
  - **Search** → SearchScreen
  - **Notifications** → NotificationsScreen
  - **VideoView** → VideoViewScreen
  - **ProfileUser** → ProfileUserScreen
  - **Comments** → CommentsScreen (transparent modal)
  - **Support** → SupportScreen
  - **StartLive** → StartLiveScreen
  - **LiveStream** → LiveStreamScreen
  - **LiveView** → LiveViewScreen
  - **Wallet** → WalletScreen

**`MainTabs.js`** (tab bar):

- **home** → HomeScreen (Accueil)
- **discover** → DiscoverScreen (Découvrir)
- **create** → CreateScreen (center button)
- **lives** → LivesScreen (Live)
- **profile** → ProfileScreen (Profil)

So: 5 tabs + 11 stack screens (Search, Notifications, VideoView, ProfileUser, Comments, Support, StartLive, LiveStream, LiveView, Wallet).

---

### 2.3 API Client Methods (`mobile-afriwonder/src/api/client.js`)

| Namespace | Methods |
|-----------|---------|
| **auth** | login, me |
| **feed** | list |
| **videos** | list, getById, like, recordView, getComments, comment, share, create, update, delete |
| **saves** | toggle, list |
| **users** | getFollowing, getLikedVideos, toggleWonder, list, getById, getStats, getFollowers |
| **notifications** | list, markAsRead, markAllAsRead |
| **upload** | image, video |
| **live** | list, getDiscovery, getRecommendations, getCategories, getById, start, startScheduled, getAgoraStatus, getStreamToken, end, sendChatMessage, getWallet, joinViewer, leaveViewer, heartbeat, sendTip, sendGift, getGifts, like, reaction, subscribeToCreator, getPolls, createPoll, votePoll, endPoll, updateChatMessage, ban, report, inviteCoHost |
| **creatorSupport** | support |

**Helper:** `getVideoPlaybackUrl(videoUrl)`, `setAuthToken(token)`.

**Not in mobile client (vs PWA expressClient):** platform, earlyAccess, ads, creatorDashboard, referrals, viralBonuses, creatorSubscription, products, cart, commissions, wallet, sellerSubscription, support (tickets), orders, gamification, and many live/admin/niche endpoints.

---

## TASK 3 — Concise Gap List (PWA → RN)

For each area: PWA feature → RN status (yes/no) and what’s missing.

---

### Auth

| PWA | RN | Gap |
|-----|----|-----|
| Landing | Yes (AuthScreen) | RN has login only; no Landing, no register flow in client (only login). |
| Login / Register | Partial | RN: login + me only; no register, no refresh, no updateMe in client. |
| UserVerification | No | — |
| PrivacyPolicy, DataProtection, TermsOfService, Help, About, VerifyCertificate | No | Legal/help pages not in RN. |

---

### Home / Feed

| PWA | RN | Gap |
|-----|----|-----|
| Home (feed) | Yes (HomeScreen) | RN has feed + videos; same core. |
| VideoView | Yes (VideoViewScreen) | Present. |
| Comments | Yes (CommentsScreen) | Present. |
| Saves / likes / share | Yes | Via api.videos, api.saves, api.users.getLikedVideos. |
| EditVideo | No | No EditVideo screen in RN. |
| Playlists / PlaylistView | No | No playlists in RN. |
| Favorites | No | — |
| Stories | No | — |

---

### Discover

| PWA | RN | Gap |
|-----|----|-----|
| Discover | Yes (DiscoverScreen) | RN has discover tab. |
| Search | Yes (SearchScreen) | Present; PWA has richer search (videos, users, products). |
| Categories / trending | Partial | RN discover may have less structure than PWA. |
| Search → Product, Chat, Profile, VideoView | Partial | RN: VideoView, ProfileUser; no Product, no Chat. |

---

### Profile

| PWA | RN | Gap |
|-----|----|-----|
| Profile (own) | Yes (ProfileScreen) | RN: header, tabs (videos/saved/liked), grid, stats (followers, following, wonderers). |
| Profile (other user) | Yes (ProfileUserScreen) | Basic. |
| PWA Profile extras | — | RN missing: full tabs parity, edit profile (Settings), wallet link, message button, product grid, featured video, “Wonder”/follow from profile. |
| Settings | No | No Settings screen in RN. |
| Profile edit, language, notification prefs | No | — |
| BadgesProfile | No | — |
| Achievements, Leaderboard, GamificationHub | No | — |
| CreatorTools, Analytics | No | — |
| Referrals | No | — |

---

### Create

| PWA | RN | Gap |
|-----|----|-----|
| Create (video) | Yes (CreateScreen) | RN: upload video, category, description, visibility, thumbnail; no ad campaign flow. |
| Create (LiveStream) | Yes (StartLiveScreen + LiveStreamScreen) | Present. |
| Create Ad Campaign, CreateAdCampaign | No | — |
| CreateCourse, CreateEvent, CreatePetition, CreateCommunity, CreateCampaign | No | — |
| EditVideo | No | — |

---

### Live

| PWA | RN | Gap |
|-----|----|-----|
| Lives list | Yes (LivesScreen) | List, discovery, recommendations, categories. |
| LiveView | Yes (LiveViewScreen) | Watch live. |
| StartLive / LiveStream | Yes (StartLiveScreen, LiveStreamScreen) | Host live. |
| PWA LiveView extras | Partial | Gifts, tips, polls, chat, subscribe, ban, report, replay chapters — RN client has many of these; UX may be slimmer. |

---

### Wallet

| PWA | RN | Gap |
|-----|----|-----|
| Wallet | Yes (WalletScreen) | RN has Wallet screen. |
| RechargeWallet | Unknown | Not seen in RN navigation; may be inside Wallet or missing. |
| MobileMoneyPayment | No | — |
| SellerWallet | No | — |
| PWA wallet flows (recharge, history, packages) | Partial | RN likely simpler. |

---

### Messages

| PWA | RN | Gap |
|-----|----|-----|
| Inbox | No | No inbox/messages in RN. |
| Chat | No | No chat screen. |
| DirectMessage | No | — |
| DirectCall | No | — |

---

### Settings

| PWA | RN | Gap |
|-----|----|-----|
| Settings | No | No Settings screen. |
| Language | No | — |
| NotificationPreferences / NotificationSettings | No | — |
| PrivacySettings | No | — |
| Addresses | No | — |
| DataProtection | No | — |

---

### Marketplace / Commerce

| PWA | RN | Gap |
|-----|----|-----|
| Marketplace | No | No marketplace. |
| Product, Cart, Checkout | No | — |
| Orders, OrderTracking, OrderReview, OrderDispute | No | — |
| Bookings, BookingDetails | No | — |
| SellerDashboard, SellerProfile, SellerStorefront, SellerOrders, SellerWallet, SellerSubscription, BecomeSeller, AddProduct, EditProduct | No | — |
| ServiceDetails, ServiceBooking, Providers, ProviderProfile, ProviderDashboard, BecomeProvider, AddService | No | — |
| MarketplaceMap | No | — |

---

### Jobs

| PWA | RN | Gap |
|-----|----|-----|
| Jobs, JobDetails | No | — |
| PostJob, JobsEmployerDashboard | No | — |
| CandidateProfile, CompanyProfile | No | — |

---

### Events / Ticketing

| PWA | RN | Gap |
|-----|----|-----|
| Events, EventDetails, CreateEvent | No | — |
| EventOrganizerDashboard, MyEventTickets | No | — |
| Ticketing, TicketDetails | No | — |

---

### Courses / Education

| PWA | RN | Gap |
|-----|----|-----|
| Courses, CourseDetails | No | — |
| CreateCourse, InstructorDashboard | No | — |
| BecomeTrainer | No | — |
| Certificates | No | — |
| Formations | No | — |

---

### Civic / News

| PWA | RN | Gap |
|-----|----|-----|
| Civic, CreatePetition, PetitionDetails | No | — |
| CivicCreatorDashboard | No | — |
| News, ArticleDetails, PublishNews | No | — |

---

### Transport / Food / Real Estate / Insurance / Utilities

| PWA | RN | Gap |
|-----|----|-----|
| Transport, RideHistory, BecomeDriver, DriverDashboard | No | — |
| FoodDelivery, RestaurantMenu | No | — |
| RealEstate, PropertyDetails | No | — |
| Insurance | No | — |
| Utilities, Telemedicine | No | — |

---

### Microcredit / Money

| PWA | RN | Gap |
|-----|----|-----|
| Microcredit, LoanDetails, RequestLoan | No | — |

---

### Ads / Creator monetization

| PWA | RN | Gap |
|-----|----|-----|
| AdvertiserDashboard, AdvertiserRegistration | No | — |
| CreateAdCampaign | No | — |
| Creator dashboard / monetization (creatorDashboard, ads, creatorSupport in PWA) | Partial | RN has creatorSupport only; no ads or creator dashboard. |

---

### Developer / Mini-apps

| PWA | RN | Gap |
|-----|----|-----|
| DeveloperPortal, DeveloperGuide, DeveloperConsole, DeveloperRevenue, DeveloperSubscription | No | — |
| MiniAppsStore, MiniAppDetails | No | — |
| AppBoost | No | — |

---

### Support / Misc

| PWA | RN | Gap |
|-----|----|-----|
| Support | Yes (SupportScreen) | Present. |
| FAQ | No | — |
| MatchingCenter | No | — |
| Crowdfunding | No | — |
| Challenges | No | — |
| Communities, CommunityDetails, CreateCommunity | No | — |
| Health | No | — |
| QRCode | No | — |
| Offline, ShareOffline | No | — |
| ComingSoon, ProjectPresentation | No | — |
| GamificationHub | No | — |
| AdminDashboard, AdminPage, ModerationDashboard | No | — |
| DisputeCenter | No | — |
| NotificationCenter (page) | No | RN has NotificationsScreen; no separate “center” page. |

---

## Summary Table (High Level)

| Area | PWA | RN | Main gaps |
|------|-----|----|-----------|
| Auth | Landing, login, register, legal pages | Login only | Register, Landing, legal/help |
| Home/Feed | Full | Full | EditVideo, Playlists, Favorites, Stories |
| Discover | Full | Full | — |
| Profile | Tabs, grid, stats, edit, wallet link | Tabs, grid, stats | Settings, edit, badges, analytics |
| Create | Video + live + ad campaign | Video + live | Ad campaign, courses/events/petitions |
| Live | Full | Full | Feature parity in UI |
| Wallet | Full | Screen exists | Recharge, Mobile Money, SellerWallet |
| Messages | Inbox, Chat, Call | None | Inbox, Chat, DirectCall |
| Settings | Full | None | All settings |
| Marketplace | Full | None | Entire commerce/seller/provider |
| Jobs | Full | None | All job flows |
| Events/Ticketing | Full | None | All |
| Courses | Full | None | All |
| Civic/News | Full | None | All |
| Transport/Food/RealEstate/Insurance/Utilities | Full | None | All |
| Microcredit | Full | None | All |
| Ads/Creator monetization | Full | creatorSupport only | Ads, dashboard |
| Developer/Mini-apps | Full | None | All |
| Support | Full | Screen | FAQ, MatchingCenter, etc. |

---

*Generated from `src/` (PWA) and `mobile-afriwonder/` (RN).*
