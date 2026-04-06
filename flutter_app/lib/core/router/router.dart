import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/faq/faq_page.dart';
import '../../features/feed/feed_page.dart';
import '../../features/feed/feed_posts_page.dart';
import '../../features/feed/video_viewer_page.dart';
import '../../features/gamification/achievements_page.dart';
import '../../features/gamification/leaderboard_page.dart';
import '../../features/auth/login_page.dart';
import '../../features/auth/register_page.dart';
import '../../features/language/language_page.dart';
import '../../features/calls/direct_call_page.dart';
import '../../features/cart/cart_page.dart';
import '../../features/live/live_viewer_page.dart';
import '../../features/live/live_host_page.dart';
import '../../features/messages/inbox_page.dart';
import '../../features/messages/chat_page.dart';
import '../../features/messages/group_chat_page.dart';
import '../../features/messages/starred_messages_page.dart';
import '../../features/menu/menu_plus_page.dart';
import '../../features/payment/checkout_page.dart' show CartCheckoutPage;
import '../../features/profile/profile_page.dart';
import '../../features/discover/discover_page.dart';
import '../../features/marketplace/marketplace_page.dart';
import '../../features/marketplace/product_details_page.dart';
import '../../features/marketplace/wishlist_page.dart';
import '../../features/orders/order_details_page.dart';
import '../../features/orders/orders_page.dart';
import '../../features/notifications/notification_preferences_page.dart';
import '../../features/notifications/notifications_page.dart';
import '../../features/news/article_details_page.dart';
import '../../features/news/news_page.dart';
import '../../features/search/search_page.dart';
import '../../features/support/support_page.dart';
import '../../features/settings/settings_page.dart';
import '../../features/settings/offline_center_page.dart';
import '../../features/upload/upload_video_page.dart';
import '../../features/wallet/recharge_wallet_page.dart';
import '../../features/wallet/wallet_page.dart';
import '../../features/privacy/privacy_center_page.dart';
import '../../features/legal/legal_documents_page.dart';
import '../../shared/providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/feed',
    redirect: (context, state) {
      final isAuth = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register');

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/feed';
      return null;
    },
    routes: [
      // ── Auth ──────────────────────────────────────────────────────────
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterPage()),

      // ── Feed ──────────────────────────────────────────────────────────
      GoRoute(path: '/feed', builder: (_, __) => const FeedPage()),
      GoRoute(path: '/posts', builder: (_, __) => const FeedPostsPage()),
      GoRoute(
        path: '/video/:id',
        builder: (_, state) => VideoViewerPage(
          videoId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(path: '/discover', builder: (_, __) => const DiscoverPage()),
      GoRoute(path: '/news', builder: (_, __) => const NewsPage()),
      GoRoute(
        path: '/news/:id',
        builder: (_, state) => ArticleDetailsPage(
          idOrSlug: state.pathParameters['id']!,
        ),
      ),
      GoRoute(path: '/search', builder: (_, __) => const SearchPage()),
      GoRoute(path: '/upload', builder: (_, __) => const UploadVideoPage()),
      GoRoute(path: '/menu-plus', builder: (_, __) => const MenuPlusPage()),

      // ── Messages ──────────────────────────────────────────────────────
      GoRoute(path: '/messages', builder: (_, __) => const InboxPage()),
      GoRoute(
          path: '/messages/starred',
          builder: (_, __) => const StarredMessagesPage()),
      GoRoute(
        path: '/messages/:id',
        builder: (_, state) => ChatPage(
          conversationId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/group/:id',
        builder: (_, state) => GroupChatPage(
          groupId: state.pathParameters['id']!,
        ),
      ),

      // ── Calls ─────────────────────────────────────────────────────────
      GoRoute(
        path: '/call/:userId',
        builder: (_, state) => DirectCallPage(
          userId: state.pathParameters['userId']!,
          channelName: state.uri.queryParameters['channel'] ??
              'call_${state.pathParameters['userId']}',
          isVideo: state.uri.queryParameters['video'] != 'false',
        ),
      ),

      // ── Live ──────────────────────────────────────────────────────────
      GoRoute(
        path: '/live/host/:channel',
        builder: (_, state) => LiveHostPage(
          channelName: state.pathParameters['channel']!,
        ),
      ),
      GoRoute(
        path: '/live/:channel',
        builder: (_, state) => LiveViewerPage(
          channelName: state.pathParameters['channel']!,
        ),
      ),

      // ── Marketplace ───────────────────────────────────────────────────
      GoRoute(
          path: '/marketplace', builder: (_, __) => const MarketplacePage()),
      GoRoute(path: '/wishlist', builder: (_, __) => const WishlistPage()),
      GoRoute(
        path: '/marketplace/product/:id',
        builder: (_, state) => ProductDetailsPage(
          productId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(path: '/cart', builder: (_, __) => const CartPage()),
      GoRoute(path: '/checkout', builder: (_, __) => const CartCheckoutPage()),

      // ── Orders ────────────────────────────────────────────────────────
      GoRoute(path: '/orders', builder: (_, __) => const OrdersPage()),
      GoRoute(
        path: '/orders/:id',
        builder: (_, state) => OrderDetailsPage(
          orderId: state.pathParameters['id']!,
        ),
      ),

      // ── Profile & social ──────────────────────────────────────────────
      GoRoute(
        path: '/profile/:id',
        builder: (_, state) => ProfilePage(
          userId: state.pathParameters['id'],
        ),
      ),
      GoRoute(
          path: '/achievements', builder: (_, __) => const AchievementsPage()),
      GoRoute(
          path: '/leaderboard', builder: (_, __) => const LeaderboardPage()),

      // ── App ───────────────────────────────────────────────────────────
      GoRoute(
          path: '/notifications',
          builder: (_, __) => const NotificationsPage()),
      GoRoute(
          path: '/notification-preferences',
          builder: (_, __) => const NotificationPreferencesPage()),
      GoRoute(path: '/wallet', builder: (_, __) => const WalletPage()),
      GoRoute(
          path: '/wallet/recharge',
          builder: (_, __) => const RechargeWalletPage()),
      GoRoute(path: '/support', builder: (_, __) => const SupportPage()),
      GoRoute(path: '/faq', builder: (_, __) => const FaqPage()),
      GoRoute(path: '/language', builder: (_, __) => const LanguagePage()),
      GoRoute(path: '/privacy', builder: (_, __) => const PrivacyCenterPage()),
      GoRoute(path: '/legal', builder: (_, __) => const LegalDocumentsPage()),
      GoRoute(path: '/offline', builder: (_, __) => const OfflineCenterPage()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsPage()),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(
        child: Text(
          'Page introuvable: ${state.error}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    ),
  );
});
