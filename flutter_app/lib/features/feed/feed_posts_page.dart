import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/socket_service.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/theme/theme.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/skeleton_loader.dart';

class FeedPostsPage extends StatefulWidget {
  const FeedPostsPage({super.key});

  @override
  State<FeedPostsPage> createState() => _FeedPostsPageState();
}

class _FeedPostsPageState extends State<FeedPostsPage> {
  final List<Map<String, dynamic>> _posts = [];
  final _newPostCtrl = TextEditingController();
  final _scroll = ScrollController();

  bool _loading = true;
  bool _posting = false;
  String? _myId;
  int _page = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _init();
    _scroll.addListener(_onScroll);
    _listenSocket();
  }

  @override
  void dispose() {
    SocketService.off('post:new');
    _newPostCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    _myId = await SecureStorage.getUserId();
    await _loadPosts();
  }

  Future<void> _loadPosts() async {
    if (!_hasMore) return;
    try {
      final res = await ApiClient.dio.get(
        '/posts',
        queryParameters: {'page': _page, 'limit': 15},
      );
      final data = res.data['data'] as Map<String, dynamic>;
      final items = (data['items'] as List? ?? []).cast<Map<String, dynamic>>();
      if (!mounted) return;
      setState(() {
        _posts.addAll(items);
        _hasMore = items.length == 15;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200 &&
        !_loading) {
      _page++;
      _loadPosts();
    }
  }

  void _listenSocket() {
    SocketService.on('post:new', (data) {
      if (!mounted || data is! Map) return;
      setState(() => _posts.insert(0, Map<String, dynamic>.from(data)));
    });
  }

  Future<void> _submitPost() async {
    final text = _newPostCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _posting = true);
    try {
      await ApiClient.dio
          .post('/posts', data: {'content': text, 'type': 'text'});
      _newPostCtrl.clear();
      // Le socket event 'post:new' mettra à jour la liste automatiquement
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _toggleLike(int index) async {
    final post = _posts[index];
    final postId = post['id']?.toString();
    if (postId == null) return;
    final liked = post['is_liked'] as bool? ?? false;
    final likesCount = (post['likes_count'] as int? ?? 0);

    // Optimistic update
    setState(() {
      _posts[index] = {
        ...post,
        'is_liked': !liked,
        'likes_count': liked ? likesCount - 1 : likesCount + 1,
      };
    });

    try {
      if (liked) {
        await ApiClient.dio.delete('/posts/$postId/like');
      } else {
        await ApiClient.dio.post('/posts/$postId/like');
      }
    } catch (_) {
      // Rollback
      if (mounted) {
        setState(() => _posts[index] = post);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AfriWonderTheme.surface,
      appBar: AppBar(
        title: const Text('Posts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.video_library_outlined),
            onPressed: () => context.go('/feed'),
            tooltip: 'Vidéos',
          ),
        ],
      ),
      body: Column(
        children: [
          // Composer
          _buildComposer(),
          const Divider(color: Color(0xFF1E293B), height: 1),

          // Liste posts
          Expanded(
            child: _loading && _posts.isEmpty
                ? ListView.builder(
                    itemCount: 3,
                    itemBuilder: (_, __) => const PostSkeleton(),
                  )
                : RefreshIndicator(
                    color: AfriWonderTheme.primary,
                    onRefresh: () async {
                      _page = 1;
                      _hasMore = true;
                      _posts.clear();
                      await _loadPosts();
                    },
                    child: ListView.builder(
                      controller: _scroll,
                      itemCount: _posts.length + (_hasMore ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (i == _posts.length) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(
                                  color: AfriWonderTheme.primary),
                            ),
                          );
                        }
                        return _PostCard(
                          post: _posts[i],
                          myId: _myId,
                          onLike: () => _toggleLike(i),
                          onProfile: (id) => context.push('/profile/$id'),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }

  Widget _buildComposer() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 20,
            backgroundColor: AfriWonderTheme.primary,
            child: Icon(Icons.person, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _newPostCtrl,
              style: const TextStyle(color: Colors.white),
              maxLines: null,
              decoration: const InputDecoration(
                hintText: 'Quoi de neuf ?',
                hintStyle: TextStyle(color: Color(0xFF64748B)),
                border: InputBorder.none,
              ),
            ),
          ),
          IconButton(
            icon: _posting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AfriWonderTheme.primary))
                : const Icon(Icons.send, color: AfriWonderTheme.primary),
            onPressed: _posting ? null : _submitPost,
          ),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final Map<String, dynamic> post;
  final String? myId;
  final VoidCallback onLike;
  final void Function(String) onProfile;

  const _PostCard({
    required this.post,
    required this.myId,
    required this.onLike,
    required this.onProfile,
  });

  @override
  Widget build(BuildContext context) {
    final author = post['user'] as Map<String, dynamic>? ?? {};
    final authorId = author['id']?.toString() ?? '';
    final fullName = author['full_name'] as String? ?? 'Anonyme';
    final username = author['username'] as String? ?? '';
    final avatarUrl = author['avatar_url'] as String?;
    final content = post['content'] as String? ?? '';
    final liked = post['is_liked'] as bool? ?? false;
    final likes = post['likes_count'] as int? ?? 0;
    final comments = post['comments_count'] as int? ?? 0;
    final images = (post['images'] as List? ?? []).cast<String>();
    final createdAt = post['created_at'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 1),
      color: const Color(0xFF020617),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                GestureDetector(
                  onTap: () => onProfile(authorId),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundImage: avatarUrl != null
                        ? CachedNetworkImageProvider(avatarUrl)
                        : null,
                    backgroundColor:
                        AfriWonderTheme.primary.withValues(alpha: 0.2),
                    child: avatarUrl == null
                        ? Text(fullName[0].toUpperCase(),
                            style:
                                const TextStyle(color: AfriWonderTheme.primary))
                        : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => onProfile(authorId),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(fullName,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14)),
                        Text('@$username',
                            style: const TextStyle(
                                color: Color(0xFF64748B), fontSize: 12)),
                      ],
                    ),
                  ),
                ),
                Text(
                  _formatDate(createdAt),
                  style:
                      const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Contenu
            if (content.isNotEmpty)
              Text(content,
                  style: const TextStyle(
                      color: Color(0xFFE2E8F0), fontSize: 15, height: 1.4)),

            // Images
            if (images.isNotEmpty) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: images.first,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: 220,
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Actions
            Row(
              children: [
                GestureDetector(
                  onTap: onLike,
                  child: Row(
                    children: [
                      Icon(
                        liked ? Icons.favorite : Icons.favorite_border,
                        color: liked ? Colors.red : const Color(0xFF64748B),
                        size: 22,
                      ),
                      const SizedBox(width: 4),
                      Text('$likes',
                          style: const TextStyle(
                              color: Color(0xFF64748B), fontSize: 13)),
                    ],
                  ),
                ),
                const SizedBox(width: 20),
                Row(
                  children: [
                    const Icon(Icons.comment_outlined,
                        color: Color(0xFF64748B), size: 22),
                    const SizedBox(width: 4),
                    Text('$comments',
                        style: const TextStyle(
                            color: Color(0xFF64748B), fontSize: 13)),
                  ],
                ),
                const Spacer(),
                const Icon(Icons.share_outlined,
                    color: Color(0xFF64748B), size: 20),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'À l\'instant';
      if (diff.inMinutes < 60) return '${diff.inMinutes} min';
      if (diff.inHours < 24) return '${diff.inHours} h';
      return '${diff.inDays} j';
    } catch (_) {
      return '';
    }
  }
}

/// Skeleton loader pour les posts
class PostSkeleton extends StatelessWidget {
  const PostSkeleton({super.key});

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SkeletonBox(width: 40, height: 40, radius: 20),
                SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SkeletonBox(width: 120, height: 12),
                  SizedBox(height: 4),
                  SkeletonBox(width: 80, height: 10),
                ]),
              ],
            ),
            SizedBox(height: 12),
            SkeletonBox(width: double.infinity, height: 14),
            SizedBox(height: 6),
            SkeletonBox(width: 200, height: 14),
            SizedBox(height: 12),
            SkeletonBox(width: double.infinity, height: 180, radius: 12),
          ],
        ),
      );
}
