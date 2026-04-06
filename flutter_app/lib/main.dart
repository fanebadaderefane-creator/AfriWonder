import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/api/dio_client.dart';
import 'core/locale/locale_provider.dart';
import 'core/api/socket_service.dart';
import 'core/push/push_service.dart';
import 'core/router/app_navigation.dart';
import 'core/router/deep_link_service.dart';
import 'core/router/router.dart';
import 'core/theme/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {}

  try {
    await Firebase.initializeApp();
  } catch (_) {}
  await Hive.initFlutter();

  ApiClient.init();
  await SocketService.connect();
  await PushService.init();

  runApp(const ProviderScope(child: AfriWonderApp()));
}

class AfriWonderApp extends ConsumerStatefulWidget {
  const AfriWonderApp({super.key});

  @override
  ConsumerState<AfriWonderApp> createState() => _AfriWonderAppState();
}

class _AfriWonderAppState extends ConsumerState<AfriWonderApp> {
  bool _linksInitialized = false;

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final language = ref.watch(appLanguageProvider).valueOrNull ?? 'fr';
    AppNavigation.attachRouter(router);

    if (!_linksInitialized) {
      _linksInitialized = true;
      Future.microtask(DeepLinkService.init);
    }

    return MaterialApp.router(
      title: 'AfriWonder',
      debugShowCheckedModeBanner: false,
      theme: AfriWonderTheme.dark,
      routerConfig: router,
      supportedLocales: const [Locale('fr'), Locale('en'), Locale('ar')],
      locale: localeFromLanguage(language),
    );
  }
}
