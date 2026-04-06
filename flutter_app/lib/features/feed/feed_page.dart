import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/video.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/skeleton_loader.dart';
import 'video_slide.dart';

class FeedPage extends StatefulWidget {
  const FeedPage({super.key});

  @override
  State<FeedPage> createState() => _FeedPageState();
}

class _FeedPageState extends State<FeedPage> {
  final PageController _pageController = PageController();
  final Map<int, VideoPlayerController> _controllers = {};
  final List<Video> _videos = [];
  final Set<String> _followingIds = <String>{};

  int _currentIndex = 0;
  int _page = 1;
  int _activeTab = 0;
  bool _initialLoading = true;
  bool _isLoadingMore = false;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _bootstrap();
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    _pageController.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await _loadCurrentUser();
    await _loadFeed(reset: true);
  }

  Future<void> _loadCurrentUser() async {
    try {
      final meRes = await ApiClient.dio.get('/auth/me');
      final me = meRes.data['data'] as Map<String, dynamic>? ?? const {};
      final userId = me['id']?.toString();
      if (userId == null || userId.isEmpty) return;
      final followsRes = await ApiClient.dio.get(
        '/users/$userId/following',
        queryParameters: const {'page': 1, 'limit': 200},
      );
      final payload =
          followsRes.data['data'] as Map<String, dynamic>? ?? const {};
      final follows = List<Map<String, dynamic>>.from(
          payload['following'] as List? ?? const []);
      _followingIds
        ..clear()
        ..addAll(
          follows
              .map((item) => item['id']?.toString() ?? '')
              .where((id) => id.isNotEmpty),
        );
    } catch (_) {}
  }

  Future<List<Video>> _fetchVideosPage(int page) async {
    if (_activeTab == 0) {
      final res = await ApiClient.dio.get(
        '/feed',
        queryParameters: {'page': page, 'limit': 25},
      );
      final raw = res.data['data'];
      final items = raw is Map<String, dynamic> ? raw['items'] : raw;
      return List<Map<String, dynamic>>.from(items as List? ?? const [])
          .map((item) {
            final videoMap = item['video'] is Map<String, dynamic>
                ? item['video'] as Map<String, dynamic>
                : item;
            return Video.fromJson(Map<String, dynamic>.from(videoMap));
          })
          .where((video) => video.videoUrl.isNotEmpty)
          .toList();
    }

    if (_followingIds.isEmpty) return const [];
    final res = await ApiClient.dio.get(
      '/videos',
      queryParameters: {'page': page, 'limit': 25},
    );
    final raw = res.data['data'];
    final items = raw is Map<String, dynamic> ? raw['videos'] : raw;
    return List<Map<String, dynamic>>.from(items as List? ?? const [])
        .map((item) => Video.fromJson(Map<String, dynamic>.from(item)))
        .where((video) =>
            video.videoUrl.isNotEmpty &&
            _followingIds.contains(video.creatorId))
        .toList();
  }

  Future<void> _loadFeed({required bool reset}) async {
    if (reset) {
      _disposeControllers();
      _page = 1;
      _currentIndex = 0;
      if (mounted) {
        setState(() {
          _videos.clear();
          _initialLoading = true;
        });
      }
    }

    try {
      final items = await _fetchVideosPage(_page);
      if (!mounted) return;
      setState(() {
        _videos.addAll(items);
        _initialLoading = false;
      });
      if (_videos.isNotEmpty) {
        unawaited(_preloadVideo(0));
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _initialLoading = false);
    }
  }

  void _disposeControllers() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    _controllers.clear();
  }

  Future<void> _refreshFeed() async {
    setState(() => _refreshing = true);
    await _loadCurrentUser();
    await _loadFeed(reset: true);
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    if (mounted) {
      setState(() => _refreshing = false);
    }
  }

  Future<void> _switchTab(int nextTab) async {
    if (nextTab == _activeTab) return;
    setState(() => _activeTab = nextTab);
    await _refreshFeed();
  }

  Future<void> _preloadVideo(int index) async {
    if (index >= _videos.length) return;
    if (_controllers.containsKey(index)) return;
    if (_videos[index].videoUrl.isEmpty) return;

    final controller = VideoPlayerController.networkUrl(
      Uri.parse(_videos[index].videoUrl),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    try {
      await controller.initialize();
    } catch (_) {
      await controller.dispose();
      return;
    }
    if (!mounted) {
      controller.dispose();
      return;
    }
    setState(() => _controllers[index] = controller);
    if (index == _currentIndex) {
      unawaited(controller.play());
    }
    if (index + 1 < _videos.length && !_controllers.containsKey(index + 1)) {
      unawaited(_preloadVideo(index + 1));
    }
  }

  void _onPageChanged(int index) {
    _controllers[_currentIndex]?.pause();
    _controllers[index]?.play();
    setState(() => _currentIndex = index);

    unawaited(_preloadVideo(index + 1));
    _cleanupFarVideos(index);
    _sendWatchEvent(index - 1);

    if (index >= _videos.length - 5 && !_isLoadingMore) {
      _isLoadingMore = true;
      _page += 1;
      _loadFeed(reset: false).whenComplete(() => _isLoadingMore = false);
    }
  }

  void _cleanupFarVideos(int current) {
    final toRemove =
        _controllers.keys.where((i) => (i - current).abs() > 4).toList();
    for (final i in toRemove) {
      _controllers[i]?.dispose();
      _controllers.remove(i);
    }
  }

  void _sendWatchEvent(int index) {
    if (index < 0 || index >= _videos.length) return;
    final ctrl = _controllers[index];
    if (ctrl == null || !ctrl.value.isInitialized) return;
    final watched = ctrl.value.position.inSeconds;
    final duration = ctrl.value.duration.inSeconds;
    unawaited(
      ApiClient.dio.post('/feed/watch-event', data: {
        'videoId': _videos[index].id,
        'watchedSeconds': watched,
        'completionRate': duration > 0 ? watched / duration : 0.0,
        'skipped': watched < 3,
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_initialLoading) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: ListView.builder(
          itemCount: 3,
          itemBuilder: (_, __) => const VideoCardSkeleton(),
        ),
      );
    }

    if (_videos.isEmpty) {
      final isFollowingTab = _activeTab == 1;
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          title: const Text('AfriWonder'),
          actions: [
            IconButton(
              onPressed: _refreshFeed,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.play_circle_outline,
                    color: Colors.white54, size: 64),
                const SizedBox(height: 16),
                Text(
                  isFollowingTab
                      ? 'Aucune vidéo de vos abonnements pour le moment'
                      : 'Aucune vidéo disponible',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                ),
                const SizedBox(height: 12),
                Text(
                  isFollowingTab
                      ? 'Suivez des créateurs depuis Discover pour remplir cet onglet.'
                      : 'Rafraîchissez ou explorez Discover.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 12,
                  children: [
                    ElevatedButton(
                      onPressed: () => context.push('/discover'),
                      child: const Text('Ouvrir Discover'),
                    ),
                    OutlinedButton(
                      onPressed: _refreshFeed,
                      child: const Text('Rafraîchir'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: const AppBottomNav(currentIndex: 0),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF050B16),
      extendBody: true,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: _videos.length,
            onPageChanged: _onPageChanged,
            itemBuilder: (_, index) => VideoSlide(
              video: _videos[index],
              controller: _controllers[index],
              isActive: index == _currentIndex,
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
              child: Column(
                children: [
                  Row(
                    children: [
                      _HeaderTab(
                        label: 'For You',
                        selected: _activeTab == 0,
                        onTap: () => _switchTab(0),
                      ),
                      const SizedBox(width: 14),
                      _HeaderTab(
                        label: 'Following',
                        selected: _activeTab == 1,
                        onTap: () => _switchTab(1),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => context.push('/search'),
                        icon: const Icon(Icons.search_rounded,
                            color: Colors.white),
                      ),
                      IconButton(
                        onPressed: () => context.push('/notifications'),
                        icon: const Icon(Icons.notifications_none_rounded,
                            color: Colors.white),
                      ),
                      if (_refreshing)
                        const Padding(
                          padding: EdgeInsets.only(left: 4),
                          child: SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }
}

class _HeaderTab extends StatelessWidget {
  const _HeaderTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedDefaultTextStyle(
        duration: const Duration(milliseconds: 180),
        style: TextStyle(
          color: selected ? Colors.white : Colors.white.withValues(alpha: 0.58),
          fontSize: selected ? 18 : 16,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        ),
        child: Text(
          label,
        ),
      ),
    );
  }
}
