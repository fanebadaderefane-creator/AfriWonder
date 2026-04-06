import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:afriwonder_mobile/src/services/backend_client.dart';
import 'package:afriwonder_mobile/src/screens/accueil_screen.dart';
import 'package:afriwonder_mobile/src/screens/search_screen.dart';
import 'package:afriwonder_mobile/src/screens/notifications_screen.dart';
import 'package:afriwonder_mobile/src/services/push_service.dart';

/// Shell principal : auth, feed vertical, push Firebase (feature shell).
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
  int _activeTab = 0;
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
    void showSnack(RemoteMessage message) {
      if (!mounted) return;
      final now = DateTime.now();
      if (_lastPushSnackAt != null &&
          now.difference(_lastPushSnackAt!) < const Duration(seconds: 1)) {
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

    FirebaseMessaging.onMessage.listen(showSnack);
    FirebaseMessaging.onMessageOpenedApp.listen(showSnack);

    try {
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null && mounted) showSnack(initial);
    } catch (_) {}
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

  List<Map<String, dynamic>> _mapFeedVideos(List<Map<String, dynamic>> items) {
    return items.map((video) {
      final v = Map<String, dynamic>.from(video);
      v['_localLikes'] =
          (v['likes'] ?? 0) is num ? (v['likes'] as num).toInt() : 0;
      v['_localIsLiked'] = (v['is_liked'] ?? false) == true;
      v['_localIsFollowing'] = _activeTab == 1;
      return v;
    }).toList();
  }

  Future<void> _loadFeed() async {
    if (_session == null) return;
    try {
      List<Map<String, dynamic>> items;
      if (_activeTab == 0) {
        items = await _client.getFeed(_session!.accessToken);
      } else {
        final userId = (_session!.user['id'] ?? '').toString();
        if (userId.isEmpty) {
          items = [];
        } else {
          items = await _client.getFollowingFeedVideos(
            accessToken: _session!.accessToken,
            userId: userId,
          );
        }
      }
      if (mounted) {
        setState(() {
          _feed = _mapFeedVideos(items);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _feed = const []);
      }
    }
  }

  Future<void> _switchFeedTab(int tab) async {
    if (tab == _activeTab) return;
    setState(() => _activeTab = tab);
    await _loadFeed();
    if (!mounted) return;
    if (_feed.isNotEmpty && _pageController.hasClients) {
      _pageController.jumpToPage(0);
      setState(() => _activeIndex = 0);
    }
  }

  Future<void> _toggleLikeAt(int index) async {
    if (_session == null || index < 0 || index >= _feed.length) return;
    final video = _feed[index];
    final videoId = (video['id'] ?? '').toString();
    if (videoId.isEmpty) return;

    final wasLiked = video['_localIsLiked'] == true;
    final likes = (video['_localLikes'] is num)
        ? (video['_localLikes'] as num).toInt()
        : 0;
    setState(() {
      _feed[index]['_localIsLiked'] = !wasLiked;
      _feed[index]['_localLikes'] =
          wasLiked ? (likes - 1).clamp(0, 1 << 31) : likes + 1;
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
    if (creatorId.isEmpty ||
        creatorId == (_session!.user['id'] ?? '').toString()) {
      return;
    }
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
          title: const Text('Connexion'),
          backgroundColor: Colors.black,
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text('Backend API: ${widget.apiBaseUrl}',
                  style: const TextStyle(color: Colors.white70)),
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
                  child: Text(_error!,
                      style: const TextStyle(color: Colors.redAccent)),
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

    if (_bottomNavIndex != 0) {
      final titles = ['', 'Découvrir', 'Créer', 'Messages', 'Profil'];
      final title = titles[_bottomNavIndex.clamp(0, 4)];
      return Scaffold(
        backgroundColor: const Color(0xFF09090B),
        appBar: AppBar(
          backgroundColor: Colors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => setState(() => _bottomNavIndex = 0),
            tooltip: 'Retour',
          ),
          title: Text(title),
        ),
        body: Center(
          child: Text(
            '$title — bientôt disponible',
            style: const TextStyle(color: Colors.white60),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return AccueilScreen(
      user: _session!.user,
      feed: _feed,
      pageController: _pageController,
      activeIndex: _activeIndex,
      activeTab: _activeTab,
      bottomNavIndex: _bottomNavIndex,
      onSwitchFeedTab: _switchFeedTab,
      onBottomNavTap: (i) => setState(() => _bottomNavIndex = i),
      onRefresh: _loadFeed,
      onLogout: _logout,
      onLikeAt: _toggleLikeAt,
      onFollowAt: _toggleFollowAt,
      onCommentAt: (_) {},
      onSearchTap: () {
        Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder: (ctx) => SearchScreen(
              client: _client,
              accessToken: _session!.accessToken,
            ),
          ),
        );
      },
      onNotificationsTap: () {
        Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder: (ctx) => NotificationsScreen(
              client: _client,
              accessToken: _session!.accessToken,
            ),
          ),
        );
      },
    );
  }
}
