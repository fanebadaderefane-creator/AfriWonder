import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/widgets/premium_ui.dart';

class MenuPlusPage extends ConsumerStatefulWidget {
  const MenuPlusPage({super.key});

  @override
  ConsumerState<MenuPlusPage> createState() => _MenuPlusPageState();
}

class _MenuPlusPageState extends ConsumerState<MenuPlusPage> {
  Map<String, dynamic>? _stats;
  int _likedCount = 0;
  bool _loading = true;

  static const _sections = [
    (
      'Wallet & Paiements',
      [
        _MenuPlusItem(
            'Mon Wallet', Icons.account_balance_wallet_outlined, '/wallet'),
      ],
    ),
    (
      'Commerce & Services',
      [
        _MenuPlusItem('Marketplace', Icons.storefront_outlined, '/marketplace',
            badge: 'Nouveau'),
        _MenuPlusItem('Actualités', Icons.newspaper_outlined, '/news'),
        _MenuPlusItem('Discover', Icons.explore_outlined, '/discover'),
      ],
    ),
    (
      'Social & Messagerie',
      [
        _MenuPlusItem(
            'Messages', Icons.chat_bubble_outline_rounded, '/messages'),
        _MenuPlusItem('Messages importants', Icons.star_border_rounded,
            '/messages/starred'),
        _MenuPlusItem('Notifications', Icons.notifications_none_rounded,
            '/notifications'),
      ],
    ),
    (
      'Créateurs & Live',
      [
        _MenuPlusItem('Créer', Icons.add_box_outlined, '/upload'),
        _MenuPlusItem('Démarrer un live', Icons.wifi_tethering_outlined,
            '/live/host/demo-room'),
      ],
    ),
    (
      'Éducation & Formation',
      [
        _MenuPlusItem(
            'Mes Badges', Icons.emoji_events_outlined, '/achievements'),
        _MenuPlusItem('Classement', Icons.leaderboard_outlined, '/leaderboard'),
      ],
    ),
    (
      'Paramètres',
      [
        _MenuPlusItem('Paramètres', Icons.settings_outlined, '/settings'),
        _MenuPlusItem('Langue', Icons.language_outlined, '/language'),
        _MenuPlusItem('Support', Icons.support_agent_outlined, '/support'),
        _MenuPlusItem('FAQ', Icons.quiz_outlined, '/faq'),
      ],
    ),
    (
      'Légal & Sécurité',
      [
        _MenuPlusItem('Politique de confidentialité',
            Icons.privacy_tip_outlined, '/privacy'),
        _MenuPlusItem('Documents légaux', Icons.gavel_outlined, '/legal'),
        _MenuPlusItem('Mode hors ligne', Icons.cloud_off_outlined, '/offline'),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).valueOrNull;
    if (user == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/users/${user.id}/stats'),
        ApiClient.dio.get('/users/${user.id}/liked-videos',
            queryParameters: {'limit': 0}),
      ]);
      final statsRes = responses[0];
      final likedRes = responses[1];
      final likedPayload = likedRes.data['data'];
      final likedVideos = likedPayload is Map<String, dynamic>
          ? List<Map<String, dynamic>>.from(
              likedPayload['videos'] as List? ?? const [])
          : (likedPayload is List
              ? List<Map<String, dynamic>>.from(likedPayload)
              : const <Map<String, dynamic>>[]);
      if (!mounted) return;
      setState(() {
        _stats = Map<String, dynamic>.from(
            statsRes.data['data'] as Map? ?? const {});
        _likedCount = likedVideos.length;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).valueOrNull;
    final followers = _stats?['followers'] ??
        _stats?['followers_count'] ??
        user?.followersCount ??
        0;
    final following = _stats?['following'] ??
        _stats?['following_count'] ??
        user?.followingCount ??
        0;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        title: const Text('Menu Plus'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
              children: [
                PremiumSurface(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: const Color(0xFF1E293B),
                            child: Text(
                              (user?.fullName.isNotEmpty == true
                                      ? user!.fullName[0]
                                      : 'U')
                                  .toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 22,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.fullName ?? 'Utilisateur',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '@${user?.username ?? user?.email.split('@').first ?? 'user'}',
                                  style:
                                      const TextStyle(color: Color(0xFF94A3B8)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _HeaderStat(value: '$followers', label: 'Wonderers'),
                          _HeaderStat(value: '$following', label: 'Wonder'),
                          _HeaderStat(value: '$_likedCount', label: 'J’aime'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                ..._sections.map((section) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: PremiumSurface(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          PremiumSectionHeader(title: section.$1),
                          const SizedBox(height: 12),
                          ...section.$2.map(
                            (item) => _MenuTile(
                              item: item,
                              onTap: () => context.push(item.route),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const Padding(
                  padding: EdgeInsets.only(top: 6, left: 6),
                  child: Text(
                    'AfriWonder v1.0.0  •  Made in Mali',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                ),
              ],
            ),
    );
  }
}

class _HeaderStat extends StatelessWidget {
  const _HeaderStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.item, required this.onTap});

  final _MenuPlusItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFF111827),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(item.icon, color: Colors.white),
          ),
          title: Text(
            item.label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (item.badge != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF97316).withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: const Color(0xFFF97316).withValues(alpha: 0.28),
                    ),
                  ),
                  child: Text(
                    item.badge!,
                    style: const TextStyle(
                      color: Color(0xFFFAB66B),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              const SizedBox(width: 10),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuPlusItem {
  const _MenuPlusItem(this.label, this.icon, this.route, {this.badge});

  final String label;
  final IconData icon;
  final String route;
  final String? badge;
}
