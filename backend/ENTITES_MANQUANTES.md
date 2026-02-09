# ⚠️ Entités Manquantes - Migration Incomplète

## 📊 État Actuel

### ✅ Entités Migrées (11 tables)
1. User
2. Video
3. Like
4. Comment
5. Follow
6. Save
7. ViewHistory
8. Product
9. Order
10. OrderItem
11. Notification

### ❌ Entités Manquantes Identifiées dans les Fonctions

#### 🎮 Gamification (2 entités)
1. **UserPoints** - Points et niveaux utilisateurs
   - `user_id`, `total_points`, `lifetime_points`, `level`, `current_level_points`, `points_for_next_level`, `last_points_awarded`
   
2. **UserBadge** - Badges utilisateurs
   - `user_id`, `badge_id`, `badge_name`, `badge_icon`, `badge_description`, `category`, `earned_date`

#### 📺 Live Streaming (3 entités)
3. **LiveStream** - Streams en direct
   - `creator_id`, `creator_name`, `title`, `description`, `category`, `stream_url`, `status`, `viewers_count`, `peak_viewers`, `started_at`, `ended_at`, `duration_minutes`, `total_gifts_amount`, `is_featured`, `room_id`

4. **LiveGift** - Cadeaux pendant les lives
   - `live_id`, `sender_id`, `sender_name`, `sender_avatar`, `creator_id`, `gift_id`, `gift_name`, `gift_icon`, `amount`, `quantity`, `total_amount`, `creator_earnings`, `platform_commission`, `message`

5. **LiveChat** - Messages de chat live
   - `live_id`, `sender_id`, `sender_name`, `sender_avatar`, `sender_role`, `message`, `message_type`, `is_deleted`, `created_date`

#### 💰 Finance & Wallet (2 entités)
6. **Wallet** - Portefeuille utilisateur
   - `user_id`, `balance`, `currency`

7. **Transaction** - Transactions financières
   - `user_id`, `type`, `amount`, `currency`, `status`, `description`

#### 🛒 E-commerce (2 entités)
8. **Cart** - Panier d'achat
   - `user_id`, `items` (JSON), `subtotal`, `coupon_code`, `coupon_discount`, `last_updated`

9. **Coupon** - Codes promo
   - `code`, `discount_percentage`, `expires_at`, `is_used`, `max_uses`, `uses_count`

#### 📊 Analytics (2 entités)
10. **VideoAnalytics** - Analytics vidéos
    - `video_id`, `creator_id`, `date`, `views`, `likes`, `comments`, `shares`, `watch_time_minutes`, `engagement_rate`, `revenue`, `audience_location`, `audience_gender`

11. **CollaboratorRevenue** - Partage de revenus
    - `creator_id`, `video_id`, `collaborator_id`, `collaborator_name`, `contribution_percentage`, `status`, `collaborator_earnings`

#### 📧 Notifications & Préférences (2 entités)
12. **NotificationPreference** - Préférences notifications
    - `user_id`, `email_*`, `sms_*`, `push_*` (various notification types)

13. **EmailLog** - Logs d'emails envoyés
    - `user_id`, `type`, `email_type`, `subject`, `sent_at`, `status`

#### 🚚 Shipping (entités potentielles)
14. **Shipping** - Expéditions
    - `order_id`, `tracking_number`, `carrier`, `status`, `estimated_delivery`, `actual_delivery`

15. **Address** - Adresses de livraison
    - `user_id`, `type`, `street`, `city`, `country`, `postal_code`, `is_default`

#### 🔐 Sécurité & Modération
16. **ContentModeration** - Modération de contenu
    - `content_id`, `content_type`, `status`, `reason`, `moderated_by`, `moderated_at`

17. **Report** - Signalements
    - `reporter_id`, `reported_id`, `reported_type`, `reason`, `status`, `created_at`

#### 📝 Reviews & Ratings
18. **ProductReview** - Avis produits
    - `product_id`, `user_id`, `rating`, `comment`, `is_verified_purchase`, `helpful_count`

#### 🎯 Autres Entités Potentielles
19. **Challenge** - Défis gamification
20. **Leaderboard** - Classements
21. **Subscription** - Abonnements
22. **PaymentMethod** - Méthodes de paiement
23. **Refund** - Remboursements
24. **Invoice** - Factures
25. **Category** - Catégories
26. **Tag** - Tags
27. **Playlist** - Playlists
28. **Share** - Partages
29. **Report** - Signalements
30. **Block** - Blocages utilisateurs

## 📋 Total Estimé

- ✅ **Migrées** : 11 entités
- ❌ **Manquantes identifiées** : ~20+ entités
- ❓ **Potentielles** : ~10+ entités supplémentaires

**Total estimé** : **40-50+ entités** au lieu de 11

## 🚨 Action Requise

### 1. Analyser toutes les fonctions
Examiner chaque fichier dans `functions/` pour identifier toutes les entités utilisées.

### 2. Créer le schéma complet
Ajouter toutes les entités manquantes au `prisma/schema.prisma`.

### 3. Générer la migration complète
Créer une migration SQL complète avec toutes les tables.

### 4. Vérifier les relations
S'assurer que toutes les foreign keys et relations sont correctes.

## 📝 Prochaines Étapes

1. ✅ Identifier toutes les entités (en cours)
2. ⏳ Créer le schéma Prisma complet
3. ⏳ Générer la migration SQL complète
4. ⏳ Tester la migration

---

**⚠️ ATTENTION : La migration n'est PAS complète ! Il manque ~30-40 entités supplémentaires.**

