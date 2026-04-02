import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:afriwonder_mobile/app/afriwonder_theme.dart';
import 'package:afriwonder_mobile/app/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox<String>('afw_offline_kv');
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  runApp(const ProviderScope(child: AfriWonderApp()));
}

class AfriWonderApp extends StatelessWidget {
  const AfriWonderApp({super.key});

  static final GoRouter _router = createAppRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'AfriWonder',
      locale: const Locale('fr', 'FR'),
      theme: afriWonderDarkTheme,
      routerConfig: _router,
    );
  }
}
