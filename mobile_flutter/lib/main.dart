import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:afriwonder_mobile/src/services/backend_client.dart';
import 'package:afriwonder_mobile/src/widgets/video_slide.dart';
import 'package:afriwonder_mobile/src/services/push_service.dart';

void main() {
  runApp(const AfriWonderMobileApp());
}

class AfriWonderMobileApp extends StatelessWidget {
  const AfriWonderMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000/api',
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AfriWonder Mobile',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF09090B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFEC4899),
          secondary: Color(0xFF3B82F6),
          surface: Color(0xFF111113),
        ),
      ),
      home: BootstrapScreen(apiBaseUrl: apiBaseUrl),
    );
  }
}

class BootstrapScreen extends StatefulWidget {
  const BootstrapScreen({super.key, required this.apiBaseUrl});

  final String apiBaseUrl;

  @override
  State<BootstrapScreen> createState() => _BootstrapScreenState();
}

class _BootstrapScreenState extends State<BootstrapScreen> {
  late final BackendClient _client;
  final PushService _pushService = PushService();
  final _identifierCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = true;
  bool _loggingIn = false;
  String? _error;
  AuthSession? _session;
  List<Map<String, dynamic>> _feed = const [];
  final PageController _pageController = PageController();
  int _activeIndex = 0;
  int _activeTab = 0; // 0 = Pour vous, 1 = Following
  int _bottomNavIndex = 0;
  DateTime? _lastPushSnackAt;

  @override
  void initState() {
    super.initState();
    _client = BackendClient(baseUrl: widget.apiBaseUrl);

    _setupPushReceivers();

    _pageController.addListener(() {
      final next = _pageController.page?.round() ?? _activeIndex;
      if (next == _activeIndex) return;
      if (!mounted) return;
      setState(() => _activeIndex = next);
    });
    _restore();
  }

  Future<void> _setupPushReceivers() async {
    // Ne pas casser les tests: la config Firebase (google-services) peut manquer en environnement CI.
    try {
      await Firebase.initializeApp();
    } catch (_) {}

    void showSnack(RemoteMessage message) {
      if (!mounted) return;
      final now = DateTime.now();
      if (_lastPushSnackAt != null && now.difference(_lastPushSnackAt!) < const Duration(seconds: 1)) {
        return;
      }
      _lastPushSnackAt = now;

      final title = message.notification?.title ??
          message.data['title']?.toString() ??
          'AfriWonder';
      final body = message.notification?.body ??
          message.data['body']?.toString() ??
          message.data['message']?.toString() ??
          '';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF111113),
          duration: const Duration(seconds: 4),
          content: Text(
            '$title\n${body.isNotEmpty ? body : 'Nouvelle notification'}',
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      showSnack(message); // Foreground: affiche un feedback immédiat.
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      showSnack(message); // L'utilisateur a touché la notif.
    });

    try {
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        // Cold start: on affiche un toast de confirmation.
        if (mounted) showSnack(initial);
      }
    } catch (_) {
      // ignore
    }
  }

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _passwordCtrl.dispose();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _restore() async {
    setState(() => _loading = true);
    try {
      final session = await _client.restoreSession();
      if (session != null) {
        _session = session;
        final userId = _session!.user['id']?.toString() ?? '';
        if (userId.isNotEmpty) {
          await _pushService.subscribeToUserTopic(userId);
        }
        await _loadFeed();
      }
    } catch (_) {
      await _client.logout();
      _session = null;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _login() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _loggingIn = true;
    });

    try {
      final session = await _client.login(
        identifier: _identifierCtrl.text,
        password: _passwordCtrl.text,
      );
      _session = session;
      final userId = _session!.user['id']?.toString() ?? '';
      if (userId.isNotEmpty) {
        await _pushService.subscribeToUserTopic(userId);
      }
      await _loadFeed();
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      if (mounted) {
        setState(() => _loggingIn = false);
      }
    }
  }

  Future<void> _loadFeed() async {
    if (_session == null) return;
    try {
      final items = await _client.getFeed(_session!.accessToken);
      if (mounted) {
        setState(() {
          _feed = items.map((video) {
            final v = Map<String, dynamic>.from(video);
            v['_localLikes'] = (v['likes'] ?? 0) is num ? (v['likes'] as num).toInt() : 0;
            v['_localIsLiked'] = (v['is_liked'] ?? false) == true;
            v['_localIsFollowing'] = false;
            return v;
          }).toList();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _feed = const []);
      }
    }
  }

  Future<void> _toggleLikeAt(int index) async {
    if (_session == null || index < 0 || index >= _feed.length) return;
    final video = _feed[index];
    final videoId = (video['id'] ?? '').toString();
    if (videoId.isEmpty) return;

    final wasLiked = video['_localIsLiked'] == true;
    final likes = (video['_localLikes'] is num) ? (video['_localLikes'] as num).toInt() : 0;
    setState(() {
      _feed[index]['_localIsLiked'] = !wasLiked;
      _feed[index]['_localLikes'] = wasLiked ? (likes - 1).clamp(0, 1 << 31) : likes + 1;
    });

    try {
      final result = await _client.toggleLike(
        accessToken: _session!.accessToken,
        videoId: videoId,
      );
      final apiLiked = result['liked'] == true;
      if (!mounted) return;
      setState(() {
        _feed[index]['_localIsLiked'] = apiLiked;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _feed[index]['_localIsLiked'] = wasLiked;
        _feed[index]['_localLikes'] = likes;
      });
    }
  }

  Future<void> _toggleFollowAt(int index) async {
    if (_session == null || index < 0 || index >= _feed.length) return;
    final video = _feed[index];
    final creatorId = (video['creator_id'] ?? '').toString();
    if (creatorId.isEmpty || creatorId == (_session!.user['id'] ?? '').toString()) return;
    final prev = video['_localIsFollowing'] == true;

    setState(() {
      _feed[index]['_localIsFollowing'] = !prev;
    });

    try {
      final result = await _client.toggleFollow(
        accessToken: _session!.accessToken,
        creatorId: creatorId,
      );
      if (!mounted) return;
      setState(() {
        _feed[index]['_localIsFollowing'] = result['following'] == true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _feed[index]['_localIsFollowing'] = prev;
      });
    }
  }

  Future<void> _logout() async {
    await _client.logout();
    if (!mounted) return;
    setState(() {
      _session = null;
      _feed = const [];
      _identifierCtrl.clear();
      _passwordCtrl.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_session == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('AfriWonder Mobile - Login'),
          backgroundColor: Colors.black,
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text('Backend API: ${widget.apiBaseUrl}', style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 18),
              TextField(
                controller: _identifierCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Email / Username / Phone',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordCtrl,
                obscureText: true,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loggingIn ? null : _login,
                  child: Text(_loggingIn ? 'Connexion...' : 'Se connecter'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_feed.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text('Bonjour ${_session!.user['full_name'] ?? _session!.user['username'] ?? ''}'),
          backgroundColor: Colors.black,
          actions: [
            IconButton(onPressed: _loadFeed, icon: const Icon(Icons.refresh)),
            IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
          ],
        ),
        body: const Center(
          child: Text('Aucune video pour le moment'),
        ),
      );
    }

    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: _feed.length,
            itemBuilder: (context, index) {
              final video = _feed[index];
              final id = (video['id'] ?? index).toString();
              final likes = (video['_localLikes'] is num) ? (video['_localLikes'] as num).toInt() : 0;
              final liked = video['_localIsLiked'] == true;
              final followed = video['_localIsFollowing'] == true;
              final comments = (video['comments_count'] is num) ? (video['comments_count'] as num).toInt() : 0;

              final isActive = index == _activeIndex;
              final shouldPreload = (index - _activeIndex).abs() <= 1;

              return VideoSlide(
                key: ValueKey('slide-$id'),
                video: video,
                isActive: isActive,
                shouldPreload: shouldPreload,
                isLiked: liked,
                likeCount: likes,
                isFollowing: followed,
                onLikeTap: () => _toggleLikeAt(index),
                onFollowTap: () => _toggleFollowAt(index),
                onCommentTap: () {},
                commentCount: comments,
              );
            },
          ),

          // Top bar: For You / Following + icons
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _activeTab = 0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'For You',
                                    style: TextStyle(
                                      color: _activeTab == 0 ? Colors.white : Colors.white54,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    height: 3,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(99),
                                      color: _activeTab == 0 ? Colors.pinkAccent : Colors.transparent,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _activeTab = 1),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Following',
                                    style: TextStyle(
                                      color: _activeTab == 1 ? Colors.white : Colors.white54,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    height: 3,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(99),
                                      color: _activeTab == 1 ? Colors.pinkAccent : Colors.transparent,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.search_rounded),
                      color: Colors.white,
                      onPressed: () {},
                    ),
                    IconButton(
                      icon: const Icon(Icons.notifications_none_rounded),
                      color: Colors.white,
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom navigation (Home / Discover / + / Messages / Profile)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Container(
                height: 68,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0x99000000)],
                  ),
                ),
                child: BottomNavigationBar(
                  backgroundColor: Colors.transparent,
                  type: BottomNavigationBarType.fixed,
                  currentIndex: _bottomNavIndex,
                  onTap: (i) => setState(() => _bottomNavIndex = i),
                  showSelectedLabels: false,
                  showUnselectedLabels: false,
                  items: [
                    BottomNavigationBarItem(
                      icon: Icon(Icons.home_rounded, size: 28, color: _bottomNavIndex == 0 ? Colors.white : Colors.white54),
                      label: 'Home',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.explore_rounded, size: 28, color: _bottomNavIndex == 1 ? Colors.white : Colors.white54),
                      label: 'Discover',
                    ),
                    BottomNavigationBarItem(
                      icon: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(color: Colors.white10, width: 1),
                        ),
                        child: const Icon(Icons.add_rounded, size: 30, color: Colors.white),
                      ),
                      label: 'Add',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.message_rounded, size: 28, color: _bottomNavIndex == 3 ? Colors.white : Colors.white54),
                      label: 'Messages',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.person_rounded, size: 28, color: _bottomNavIndex == 4 ? Colors.white : Colors.white54),
                      label: 'Profile',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
