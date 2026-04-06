import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/locale/locale_provider.dart';

class LanguagePage extends ConsumerWidget {
  const LanguagePage({super.key});

  static const _options = [
    ('fr', 'Francais', 'Langue principale de la PWA'),
    ('en', 'English', 'International audience'),
    ('ar', 'العربية', 'Arabic support'),
    ('bm', 'Bambara', 'Mapped to French locale for now'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(appLanguageProvider).valueOrNull ?? 'fr';

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Langue'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _options.map((option) {
          final isSelected = option.$1 == selected;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color:
                    isSelected ? const Color(0xFFF97316) : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: ListTile(
              onTap: () =>
                  ref.read(appLanguageProvider.notifier).setLanguage(option.$1),
              title: Text(
                option.$2,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                option.$3,
                style: const TextStyle(color: Color(0xFF94A3B8)),
              ),
              trailing: isSelected
                  ? const Icon(Icons.check_circle, color: Color(0xFFF97316))
                  : null,
            ),
          );
        }).toList(),
      ),
    );
  }
}
