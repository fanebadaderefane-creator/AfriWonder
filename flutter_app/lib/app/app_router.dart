import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:afriwonder_mobile/features/shell/bootstrap_screen.dart';

/// API backend — override via `--dart-define=API_BASE_URL=https://.../api`
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api',
);

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) =>
            const BootstrapScreen(apiBaseUrl: kApiBaseUrl),
      ),
    ],
  );
}
