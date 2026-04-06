import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _languageKey = 'app_language';

class AppLanguageNotifier extends AsyncNotifier<String> {
  @override
  Future<String> build() async {
    final box = await Hive.openBox<String>('afw_offline_kv');
    return box.get(_languageKey, defaultValue: 'fr') ?? 'fr';
  }

  Future<void> setLanguage(String language) async {
    final box = await Hive.openBox<String>('afw_offline_kv');
    await box.put(_languageKey, language);
    state = AsyncValue.data(language);
  }
}

final appLanguageProvider =
    AsyncNotifierProvider<AppLanguageNotifier, String>(AppLanguageNotifier.new);

Locale localeFromLanguage(String language) {
  switch (language) {
    case 'en':
      return const Locale('en');
    case 'ar':
      return const Locale('ar');
    case 'bm':
      return const Locale('fr');
    case 'fr':
    default:
      return const Locale('fr');
  }
}
