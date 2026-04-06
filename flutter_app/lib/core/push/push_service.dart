import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/dio_client.dart';
import '../router/app_navigation.dart';

@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  // Reserved for future background sync work.
}

class PushService {
  static final _local = FlutterLocalNotificationsPlugin();
  static String? _currentToken;

  static Future<void> init() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _local.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: _onTap,
    );

    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus != AuthorizationStatus.authorized) return;

    final token = await messaging.getToken();
    if (token != null) {
      _currentToken = token;
      await syncDeviceToken();
    }

    messaging.onTokenRefresh.listen((token) async {
      _currentToken = token;
      await syncDeviceToken();
    });
    FirebaseMessaging.onMessage.listen(_showLocalNotification);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleTap(initialMessage);
    }
  }

  static Future<void> syncDeviceToken() async {
    final token = _currentToken;
    if (token == null || token.isEmpty) return;
    try {
      await ApiClient.dio.post('/notifications/device-token', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (_) {}
  }

  static Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _local.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'afriwonder_main',
          'AfriWonder',
          channelDescription: 'Notifications AfriWonder',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: '${message.data['type'] ?? ''}|${message.data['id'] ?? ''}',
    );
  }

  static void _onTap(NotificationResponse response) {
    final payload = response.payload ?? '';
    final parts = payload.split('|');
    final type = parts.isNotEmpty ? parts[0] : null;
    final id = parts.length > 1 && parts[1].isNotEmpty ? parts[1] : null;
    _routeByType(type, id);
  }

  static void _handleTap(RemoteMessage message) {
    _routeByType(message.data['type'], message.data['id']);
  }

  static void _routeByType(String? type, String? id) {
    switch (type) {
      case 'video':
      case 'like':
      case 'comment':
        AppNavigation.go('/feed');
        return;
      case 'live':
        AppNavigation.go(
          id != null && id.isNotEmpty ? '/live/$id' : '/feed',
        );
        return;
      case 'message':
        AppNavigation.go(
          id != null && id.isNotEmpty ? '/messages/$id' : '/messages',
        );
        return;
      case 'follow':
        AppNavigation.go(
          id != null && id.isNotEmpty ? '/profile/$id' : '/notifications',
        );
        return;
      case 'product':
        AppNavigation.go(
          id != null && id.isNotEmpty
              ? '/marketplace/product/$id'
              : '/marketplace',
        );
        return;
      case 'cart':
        AppNavigation.go('/cart');
        return;
      case 'order':
        AppNavigation.go(
          id != null && id.isNotEmpty ? '/orders/$id' : '/orders',
        );
        return;
      default:
        AppNavigation.go('/notifications');
        return;
    }
  }
}
