import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Push via FCM topic subscription.
///
/// Backend sends notifications to `/topics/user_<userId>` when `FIREBASE_SERVER_KEY`
/// is configured. So on mobile we only need to subscribe the device to that topic.
class PushService {
  Future<void> subscribeToUserTopic(String userId) async {
    final uid = userId.trim();
    if (uid.isEmpty) return;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
    } catch (_) {
      // If Firebase is not configured yet (missing google-services config),
      // keep the app functional.
    }

    try {
      // iOS/Android: request permissions if needed (safe to ignore if already granted).
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      // ignore: unused_local_variable
      final _ = settings;
    } catch (_) {
      // Some platforms don't require permission prompts (e.g. Android before 13).
    }

    try {
      await FirebaseMessaging.instance.subscribeToTopic('user_$uid');
    } catch (_) {
      // Keep app functional even if push is not configured yet.
    }
  }
}

