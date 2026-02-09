-- ========================================
-- INDEXES CRITIQUES PERFORMANCE
-- Basé sur queries fréquentes identifiées
-- ========================================

-- USERS: Recherche username, email, verification
CREATE INDEX IF NOT EXISTS idx_users_username ON "User"(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_users_verified ON "User"(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "User"(created_at DESC);

-- VIDEOS: Feed, recherche, trending
CREATE INDEX IF NOT EXISTS idx_videos_user_created ON "Video"(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_visibility_created ON "Video"(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category ON "Video"(category);
CREATE INDEX IF NOT EXISTS idx_videos_views ON "Video"(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_likes ON "Video"(likes DESC);

-- LIKES: Performance feed
CREATE INDEX IF NOT EXISTS idx_likes_user_video ON "Like"(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_created ON "Like"(video_id, created_at DESC);

-- COMMENTS: Performance vidéo
CREATE INDEX IF NOT EXISTS idx_comments_video_created ON "Comment"(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON "Comment"(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON "Comment"(parent_id) WHERE parent_id IS NOT NULL;

-- FOLLOWS: Performance profil
CREATE INDEX IF NOT EXISTS idx_follows_follower ON "Follow"(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON "Follow"(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_unique ON "Follow"(follower_id, following_id);

-- PRODUCTS: Marketplace (Product has no is_featured column)
CREATE INDEX IF NOT EXISTS idx_products_seller_status ON "Product"(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON "Product"(category, price);

-- ORDERS: E-commerce
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON "Order"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON "Order"(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON "Order"(status, created_at DESC);

-- TRANSACTIONS: Finance
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON "Transaction"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON "Transaction"(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON "Transaction"(reference_id);

-- WALLETS: Performance paiements
CREATE INDEX IF NOT EXISTS idx_wallets_user ON "Wallet"(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON "Wallet"(currency);

-- NOTIFICATIONS: Performance temps réel
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON "Notification"(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON "Notification"(user_id) WHERE is_read = false;

-- MESSAGES: Chat performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON "Message"(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON "Message"(sender_id);

-- CONVERSATIONS: Messagerie
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON "Conversation"(user1_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON "Conversation"(user2_id, updated_at DESC);

-- LIVESTREAMS: Performance live
CREATE INDEX IF NOT EXISTS idx_livestreams_user_status ON "LiveStream"(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_livestreams_status_viewers ON "LiveStream"(status, viewers_count DESC);
CREATE INDEX IF NOT EXISTS idx_livestreams_started ON "LiveStream"(started_at DESC) WHERE status = 'live';

-- COURSES: Education
CREATE INDEX IF NOT EXISTS idx_courses_instructor_published ON "Course"(creator_id, is_published);
CREATE INDEX IF NOT EXISTS idx_courses_category_price ON "Course"(category, price);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON "Course"(rating DESC);

-- ENROLLMENTS: Education (Enrollment has no status column)
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON "Enrollment"(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_created ON "Enrollment"(course_id, created_at DESC);

-- JOBS: Emploi
CREATE INDEX IF NOT EXISTS idx_jobs_employer_status ON "Job"(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_location_type ON "Job"(location, job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON "Job"(created_at DESC);

-- EVENTS: Événements
CREATE INDEX IF NOT EXISTS idx_events_organizer ON "Event"(organizer_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_date_status ON "Event"(start_date, status);
CREATE INDEX IF NOT EXISTS idx_events_category ON "Event"(category);

-- MICROCREDIT: Prêts
CREATE INDEX IF NOT EXISTS idx_loans_borrower_status ON "LoanRequest"(borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_status_created ON "LoanRequest"(status, created_at DESC);

-- COMMUNITIES: Social
CREATE INDEX IF NOT EXISTS idx_communities_name ON "Community"(name);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON "CommunityMember"(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON "CommunityMember"(community_id, role);

-- STORIES: Performance feed
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON "Story"(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON "Story"(expires_at DESC);

-- REVIEWS: E-commerce
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON "Review"(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON "Review"(user_id);

-- SERVICE BOOKINGS: Services locaux
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON "ServiceBooking"(provider_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON "ServiceBooking"(customer_id, status);

-- ADMIN LOGS: Audit
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_timestamp ON "AdminLog"(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON "AdminLog"(created_at DESC);
