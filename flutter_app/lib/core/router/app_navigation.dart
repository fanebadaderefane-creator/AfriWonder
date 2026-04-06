import 'package:go_router/go_router.dart';

class AppNavigation {
  static GoRouter? _router;
  static String? _pendingLocation;

  static void attachRouter(GoRouter router) {
    _router = router;
    final pendingLocation = _pendingLocation;
    if (pendingLocation != null) {
      _pendingLocation = null;
      router.go(pendingLocation);
    }
  }

  static void go(String location) {
    if (_router == null) {
      _pendingLocation = location;
      return;
    }
    _router!.go(location);
  }

  static void push(String location) {
    if (_router == null) {
      _pendingLocation = location;
      return;
    }
    _router!.push(location);
  }
}
