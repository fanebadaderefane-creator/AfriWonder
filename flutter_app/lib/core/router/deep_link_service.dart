import 'dart:async';

import 'package:app_links/app_links.dart';

import 'app_navigation.dart';

class DeepLinkService {
  static final AppLinks _appLinks = AppLinks();
  static StreamSubscription<Uri>? _subscription;
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    final initialUri = await _appLinks.getInitialLink();
    if (initialUri != null) {
      _handleUri(initialUri);
    }

    _subscription = _appLinks.uriLinkStream.listen(_handleUri);
  }

  static void _handleUri(Uri uri) {
    final path = _mapUriToPath(uri);
    if (path != null) {
      AppNavigation.go(path);
    }
  }

  static String? _mapUriToPath(Uri uri) {
    final segments =
        uri.pathSegments.where((segment) => segment.isNotEmpty).toList();

    if (segments.isEmpty) {
      return '/feed';
    }

    switch (segments.first) {
      case 'feed':
        return '/feed';
      case 'discover':
        return '/discover';
      case 'messages':
        if (segments.length > 1) return '/messages/${segments[1]}';
        return '/messages';
      case 'profile':
        if (segments.length > 1) return '/profile/${segments[1]}';
        return '/profile/me';
      case 'live':
        if (segments.length > 1) return '/live/${segments[1]}';
        return '/feed';
      case 'marketplace':
        if (segments.length > 2 && segments[1] == 'product') {
          return '/marketplace/product/${segments[2]}';
        }
        return '/marketplace';
      case 'cart':
        return '/cart';
      case 'orders':
        if (segments.length > 1) return '/orders/${segments[1]}';
        return '/orders';
      case 'notifications':
        return '/notifications';
      case 'settings':
        return '/settings';
      case 'upload':
        return '/upload';
      default:
        return '/feed';
    }
  }

  static Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
    _initialized = false;
  }
}
