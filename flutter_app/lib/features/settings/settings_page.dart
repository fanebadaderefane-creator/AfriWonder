import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_service.dart';
import '../../shared/providers/auth_provider.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _checkingBiometrics = true;
  bool _biometricsAvailable = false;
  bool _logoutLoading = false;

  @override
  void initState() {
    super.initState();
    _loadBiometrics();
  }

  Future<void> _loadBiometrics() async {
    final available = await AuthService.canUseBiometrics();
    if (!mounted) return;
    setState(() {
      _biometricsAvailable = available;
      _checkingBiometrics = false;
    });
  }

  Future<void> _logout() async {
    setState(() => _logoutLoading = true);
    await ref.read(authProvider.notifier).logout();
    if (!mounted) return;
    setState(() => _logoutLoading = false);
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).valueOrNull;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text(
          'Parametres',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Color(0xFF2563EB),
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? 'Compte AfriWonder',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user?.email ?? '',
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Compte'),
          _SettingsTile(
            icon: Icons.grid_view_rounded,
            title: 'Menu Plus',
            subtitle: 'Accès rapide à tous les modules',
            onTap: () => context.push('/menu-plus'),
          ),
          _SettingsTile(
            icon: Icons.notifications_outlined,
            title: 'Notifications',
            subtitle: 'Ouvrir le centre de notifications',
            onTap: () => context.push('/notifications'),
          ),
          _SettingsTile(
            icon: Icons.tune_rounded,
            title: 'Préférences notifications',
            subtitle: 'Push, email et SMS',
            onTap: () => context.push('/notification-preferences'),
          ),
          _SettingsTile(
            icon: Icons.account_balance_wallet_outlined,
            title: 'Wallet',
            subtitle: 'Consulter le solde et les mouvements',
            onTap: () => context.push('/wallet'),
          ),
          _SettingsTile(
            icon: Icons.add_card_outlined,
            title: 'Recharger le wallet',
            subtitle: 'Écran dédié de recharge',
            onTap: () => context.push('/wallet/recharge'),
          ),
          _SettingsTile(
            icon: Icons.lock_outline,
            title: 'Biometrie',
            subtitle: _checkingBiometrics
                ? 'Verification en cours...'
                : _biometricsAvailable
                    ? 'Face ID / empreinte disponible sur cet appareil'
                    : 'Non disponible sur cet appareil',
          ),
          _SettingsTile(
            icon: Icons.language_outlined,
            title: 'Langue',
            subtitle: 'Francais',
            onTap: () => context.push('/language'),
          ),
          _SettingsTile(
            icon: Icons.newspaper_outlined,
            title: 'Actualités',
            subtitle: 'Consulter les news et articles',
            onTap: () => context.push('/news'),
          ),
          _SettingsTile(
            icon: Icons.emoji_events_outlined,
            title: 'Achievements',
            subtitle: 'Points, niveau et badges',
            onTap: () => context.push('/achievements'),
          ),
          _SettingsTile(
            icon: Icons.leaderboard_outlined,
            title: 'Leaderboard',
            subtitle: 'Classements des créateurs et contributeurs',
            onTap: () => context.push('/leaderboard'),
          ),
          _SettingsTile(
            icon: Icons.quiz_outlined,
            title: 'FAQ',
            subtitle: 'Questions fréquentes',
            onTap: () => context.push('/faq'),
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Center',
            subtitle: 'Données personnelles, cookies et sécurité',
            onTap: () => context.push('/privacy'),
          ),
          _SettingsTile(
            icon: Icons.gavel_outlined,
            title: 'Documents légaux',
            subtitle: 'Conditions, confidentialité et conformité',
            onTap: () => context.push('/legal'),
          ),
          _SettingsTile(
            icon: Icons.support_agent_outlined,
            title: 'Support',
            subtitle: 'Créer et suivre vos tickets',
            onTap: () => context.push('/support'),
          ),
          _SettingsTile(
            icon: Icons.cloud_off_outlined,
            title: 'Mode hors ligne',
            subtitle: 'État réseau et résilience locale',
            onTap: () => context.push('/offline'),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Creation'),
          _SettingsTile(
            icon: Icons.video_call_outlined,
            title: 'Publier une video',
            subtitle: 'Ouvrir la camera ou la galerie',
            onTap: () => context.push('/upload'),
          ),
          _SettingsTile(
            icon: Icons.wifi_tethering_outlined,
            title: 'Demarrer un live',
            subtitle: 'Creer un salon live Agora',
            onTap: () => context.push('/live/host/demo-room'),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _logoutLoading ? null : _logout,
              icon: _logoutLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.logout),
              label: const Text('Se deconnecter'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.redAccent,
                side: const BorderSide(color: Colors.redAccent),
                minimumSize: const Size(double.infinity, 52),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;

  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
      ),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF1E293B),
          child: Icon(icon, color: const Color(0xFF2563EB)),
        ),
        title: Text(
          title,
          style:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: Color(0xFF94A3B8)),
        ),
        trailing: onTap != null
            ? const Icon(Icons.chevron_right, color: Color(0xFF64748B))
            : null,
      ),
    );
  }
}
