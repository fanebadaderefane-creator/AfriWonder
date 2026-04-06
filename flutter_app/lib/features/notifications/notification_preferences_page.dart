import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';
import '../../shared/widgets/premium_ui.dart';

class NotificationPreferencesPage extends StatefulWidget {
  const NotificationPreferencesPage({super.key});

  @override
  State<NotificationPreferencesPage> createState() =>
      _NotificationPreferencesPageState();
}

class _NotificationPreferencesPageState
    extends State<NotificationPreferencesPage> {
  Map<String, dynamic> _prefs = {};
  bool _loading = true;
  bool _saving = false;

  static const _keys = [
    ('push_like', 'Likes', 'Recevoir les likes'),
    ('push_comment', 'Commentaires', 'Recevoir les commentaires'),
    ('push_follow', 'Abonnements', 'Recevoir les nouveaux followers'),
    ('push_order', 'Commandes', 'Suivi des commandes'),
    ('push_live', 'Live', 'Lives et rappels'),
    ('email_order', 'Emails commandes', 'Mails transactionnels'),
    ('sms_order', 'SMS commandes', 'SMS essentiels'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/notifications/preferences');
      if (!mounted) return;
      setState(() {
        _prefs =
            Map<String, dynamic>.from(res.data['data'] as Map? ?? const {});
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _toggle(String key, bool value) async {
    setState(() {
      _prefs[key] = value;
      _saving = true;
    });
    try {
      await ApiClient.dio.put('/notifications/preferences', data: {key: value});
    } catch (_) {
      if (!mounted) return;
      setState(() => _prefs[key] = !value);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        title: const Text('Préférences notifications'),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
              children: [
                PremiumSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const PremiumSectionHeader(
                        title: 'Notifications',
                        subtitle:
                            'Contrôlez ce que vous recevez sur mobile, email et SMS.',
                      ),
                      const SizedBox(height: 12),
                      ..._keys.map((entry) {
                        final key = entry.$1;
                        return SwitchListTile(
                          value: _prefs[key] == true,
                          onChanged: (value) => _toggle(key, value),
                          activeColor: const Color(0xFFF97316),
                          title: Text(
                            entry.$2,
                            style: const TextStyle(color: Colors.white),
                          ),
                          subtitle: Text(
                            entry.$3,
                            style: const TextStyle(color: Color(0xFF94A3B8)),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
