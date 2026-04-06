import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/user.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/premium_ui.dart';
import '../../shared/widgets/skeleton_loader.dart';

class ProfilePage extends ConsumerStatefulWidget {
  final String? userId;

  const ProfilePage({super.key, this.userId});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  AppUser? _profile;
  List<Map<String, dynamic>> _videos = [];
  List<Map<String, dynamic>> _savedVideos = [];
  List<Map<String, dynamic>> _likedVideos = [];
  bool _loading = true;
  bool _isFollowing = false;
  int _activeTab = 0;
  Map<String, dynamic>? _stats;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final me = ref.read(authProvider).valueOrNull;
      final id = (widget.userId == 'me' || widget.userId == null)
          ? me?.id
          : widget.userId;
      if (id == null || id.isEmpty) {
        if (mounted) {
          setState(() {
            _loading = false;
            _profile = null;
          });
        }
        return;
      }
      final isOwnerTarget = id == me?.id;

      final requests = <Future<dynamic>>[
        ApiClient.dio.get('/users/$id'),
        ApiClient.dio.get('/users/$id/videos'),
      ];
      if (isOwnerTarget) {
        requests.add(ApiClient.dio
            .get('/saves', queryParameters: {'page': 1, 'limit': 30}));
        requests.add(ApiClient.dio.get('/users/$id/liked-videos',
            queryParameters: {'page': 1, 'limit': 30}));
      }

      final responses = await Future.wait(requests);

      final profileRes = responses[0];
      final videosRes = responses[1];
      final savesRes = responses.length > 2 ? responses[2] : null;
      final likesRes = responses.length > 3 ? responses[3] : null;
      final savesPayload = savesRes?.data['data'];
      final likesPayload = likesRes?.data['data'];
      final savedVideos = savesPayload is Map<String, dynamic>
          ? List<Map<String, dynamic>>.from(
              savesPayload['videos'] as List? ?? const [])
          : const <Map<String, dynamic>>[];
      final likedVideos = likesPayload is Map<String, dynamic>
          ? List<Map<String, dynamic>>.from(
              likesPayload['videos'] as List? ?? const [])
          : (likesPayload is List
              ? List<Map<String, dynamic>>.from(likesPayload)
              : const <Map<String, dynamic>>[]);

      try {
        final statsRes = await ApiClient.dio.get('/users/$id/stats');
        _stats = Map<String, dynamic>.from(
            statsRes.data['data'] as Map? ?? const {});
      } catch (_) {
        _stats = null;
      }

      setState(() {
        _profile =
            AppUser.fromJson(profileRes.data['data'] as Map<String, dynamic>);
        _videos =
            List<Map<String, dynamic>>.from(videosRes.data['data'] as List);
        _savedVideos = savedVideos;
        _likedVideos = likedVideos;
        _isFollowing =
            profileRes.data['data']['is_following'] as bool? ?? false;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _showStatsDialog() async {
    if (_stats == null) return;
    await showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0B111D),
        title:
            const Text('Statistiques', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _StatRow('Vues', '${_stats?['total_views'] ?? 0}'),
            _StatRow('Likes', '${_stats?['total_likes'] ?? 0}'),
            _StatRow('Commentaires', '${_stats?['total_comments'] ?? 0}'),
            _StatRow('Partages', '${_stats?['total_shares'] ?? 0}'),
          ],
        ),
      ),
    );
  }

  Future<void> _showFollowersDialog({required bool following}) async {
    final profileId = _profile?.id;
    if (profileId == null) return;
    final endpoint = following
        ? '/users/$profileId/following'
        : '/users/$profileId/followers';
    try {
      final res = await ApiClient.dio
          .get(endpoint, queryParameters: {'page': 1, 'limit': 100});
      final payload = res.data['data'] as Map<String, dynamic>? ?? const {};
      final users = List<Map<String, dynamic>>.from(
        (following ? payload['following'] : payload['followers']) as List? ??
            const [],
      );
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: const Color(0xFF0B111D),
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        builder: (_) => SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.72,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    following ? 'Abonnements' : 'Wonderers',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: users.length,
                    itemBuilder: (_, index) {
                      final user = users[index];
                      final avatar = (user['profile_image'] ?? '').toString();
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: avatar.isNotEmpty
                              ? CachedNetworkImageProvider(avatar)
                              : null,
                          child:
                              avatar.isEmpty ? const Icon(Icons.person) : null,
                        ),
                        title: Text(
                          (user['full_name'] ??
                                  user['username'] ??
                                  'Utilisateur')
                              .toString(),
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(
                          '@${(user['username'] ?? '').toString()}',
                          style: const TextStyle(color: Color(0xFF94A3B8)),
                        ),
                        onTap: () {
                          Navigator.of(context).pop();
                          context.push('/profile/${user['id']}');
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (_) {}
  }

  Future<void> _toggleFollow() async {
    final previous = _isFollowing;
    setState(() => _isFollowing = !_isFollowing);

    try {
      if (!previous) {
        await ApiClient.dio.post('/users/${_profile!.id}/follow');
      } else {
        await ApiClient.dio.delete('/users/${_profile!.id}/follow');
      }
    } catch (_) {
      setState(() => _isFollowing = previous);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(authProvider).valueOrNull;
    final isOwner = _profile?.id == me?.id;
    final tabs = [
      ('Videos', _videos),
      if (isOwner) ('Favoris', _savedVideos),
      if (isOwner) ('Likes', _likedVideos),
    ];
    final safeActiveTab = _activeTab >= tabs.length ? 0 : _activeTab;
    final activeItems = tabs[safeActiveTab].$2;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2563EB)),
            )
          : _profile == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Profil introuvable',
                          style: TextStyle(color: Colors.white, fontSize: 18),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go('/feed');
                            }
                          },
                          child: const Text('Retour'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: CustomScrollView(
                    slivers: [
                      SliverAppBar(
                        backgroundColor: const Color(0xFF020617),
                        expandedHeight: 260,
                        pinned: true,
                        actions: [
                          IconButton(
                            onPressed: () => context.push('/menu-plus'),
                            icon: const Icon(Icons.grid_view_rounded),
                          ),
                          IconButton(
                            onPressed: () => context.push('/notifications'),
                            icon: const Icon(Icons.notifications_outlined),
                          ),
                          IconButton(
                            onPressed: () => context.push('/settings'),
                            icon: const Icon(Icons.settings_outlined),
                          ),
                        ],
                        flexibleSpace: FlexibleSpaceBar(
                          background: _buildHeader(isOwner),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                          child: PremiumSurface(
                            padding: const EdgeInsets.all(12),
                            child: Wrap(
                              spacing: 8,
                              children: List.generate(tabs.length, (index) {
                                final selected = safeActiveTab == index;
                                return PremiumChoiceChip(
                                  label: tabs[index].$1,
                                  selected: selected,
                                  onTap: () =>
                                      setState(() => _activeTab = index),
                                );
                              }),
                            ),
                          ),
                        ),
                      ),
                      if (activeItems.isEmpty)
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Text(
                              'Aucun contenu dans ${tabs[safeActiveTab].$1.toLowerCase()}',
                              style: const TextStyle(color: Colors.white70),
                            ),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 1),
                          sliver: SliverGrid(
                            delegate: SliverChildBuilderDelegate(
                              (_, index) {
                                final video = activeItems[index];
                                final imageUrl = (video['thumbnail_url'] ??
                                        video['image_url'] ??
                                        '')
                                    .toString();
                                return GestureDetector(
                                  onTap: () {
                                    final vid = video['id']?.toString() ?? '';
                                    if (vid.isNotEmpty) {
                                      context.push('/video/$vid');
                                    }
                                  },
                                  child: imageUrl.isEmpty
                                      ? const ColoredBox(
                                          color: Color(0xFF1E293B))
                                      : CachedNetworkImage(
                                          imageUrl: imageUrl,
                                          fit: BoxFit.cover,
                                          placeholder: (_, __) =>
                                              const SkeletonBox(radius: 0),
                                          errorWidget: (_, __, ___) =>
                                              const ColoredBox(
                                                  color: Color(0xFF1E293B)),
                                        ),
                                );
                              },
                              childCount: activeItems.length,
                            ),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 1,
                              mainAxisSpacing: 1,
                              childAspectRatio: 9 / 16,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildHeader(bool isOwner) {
    if (_profile == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 80, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundImage: _profile!.avatarUrl != null
                    ? CachedNetworkImageProvider(_profile!.avatarUrl!)
                    : null,
                child: _profile!.avatarUrl == null
                    ? const Icon(Icons.person, size: 36, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _Stat('${_videos.length}', 'Videos'),
                    _Stat(
                      '${_profile!.followersCount}',
                      'Wonderers',
                      onTap: () => _showFollowersDialog(following: false),
                    ),
                    _Stat(
                      '${_profile!.followingCount}',
                      'Wonder',
                      onTap: () => _showFollowersDialog(following: true),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _profile!.fullName,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 22,
            ),
          ),
          if (_profile!.username != null)
            Text(
              '@${_profile!.username}',
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          if (_profile!.bio != null) ...[
            const SizedBox(height: 4),
            Text(
              _profile!.bio!,
              style: const TextStyle(
                color: Colors.white70,
                height: 1.35,
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (!isOwner)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _toggleFollow,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isFollowing
                      ? const Color(0xFF1E293B)
                      : const Color(0xFF2563EB),
                  minimumSize: const Size(double.infinity, 40),
                ),
                child: Text(_isFollowing ? 'Abonne' : "S'abonner"),
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _showStatsDialog,
                    icon: const Icon(Icons.analytics_outlined),
                    label: const Text('Stats'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF2563EB),
                      side: const BorderSide(color: Color(0xFF2563EB)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/upload'),
                    icon: const Icon(Icons.video_call_outlined),
                    label: const Text('Publier'),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  final VoidCallback? onTap;

  const _Stat(this.value, this.label, {this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            Text(
              label,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(color: Color(0xFF94A3B8)),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
