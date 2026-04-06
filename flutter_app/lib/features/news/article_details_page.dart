import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';

class ArticleDetailsPage extends StatefulWidget {
  const ArticleDetailsPage({super.key, required this.idOrSlug});

  final String idOrSlug;

  @override
  State<ArticleDetailsPage> createState() => _ArticleDetailsPageState();
}

class _ArticleDetailsPageState extends State<ArticleDetailsPage> {
  Map<String, dynamic>? _article;
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _submitting = false;
  final _commentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final articleRes = await ApiClient.dio.get('/news/${widget.idOrSlug}');
      final article = Map<String, dynamic>.from(articleRes.data['data']
              ?['article'] ??
          articleRes.data['data'] ??
          const {});
      List<Map<String, dynamic>> comments = [];
      final articleId = article['id']?.toString();
      if (articleId != null && articleId.isNotEmpty) {
        try {
          final commentsRes =
              await ApiClient.dio.get('/news/$articleId/comments');
          comments = List<Map<String, dynamic>>.from(
              commentsRes.data['data'] as List? ?? const []);
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _article = article;
        _comments = comments;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleLike() async {
    final articleId = _article?['id']?.toString();
    if (articleId == null || articleId.isEmpty) return;
    try {
      await ApiClient.dio.post('/news/$articleId/like', data: const {});
      await _load();
    } catch (_) {}
  }

  Future<void> _share() async {
    final articleId = _article?['id']?.toString();
    if (articleId == null || articleId.isEmpty) return;
    try {
      await ApiClient.dio.post('/news/$articleId/share', data: const {});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Partage enregistré')),
      );
    } catch (_) {}
  }

  Future<void> _addComment() async {
    final articleId = _article?['id']?.toString();
    if (articleId == null ||
        articleId.isEmpty ||
        _commentCtrl.text.trim().isEmpty) {
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiClient.dio.post('/news/$articleId/comments', data: {
        'content': _commentCtrl.text.trim(),
      });
      _commentCtrl.clear();
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Commentaire impossible: $error'),
            backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final article = _article;
    final imageUrl =
        (article?['featured_image'] ?? article?['cover_image'] ?? '')
            .toString();

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Article'),
        actions: [
          IconButton(
              onPressed: _toggleLike, icon: const Icon(Icons.favorite_border)),
          IconButton(onPressed: _share, icon: const Icon(Icons.share_outlined)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : article == null
              ? const Center(
                  child: Text('Article introuvable',
                      style: TextStyle(color: Colors.white)),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (imageUrl.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: CachedNetworkImage(
                          imageUrl: imageUrl,
                          height: 220,
                          fit: BoxFit.cover,
                        ),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      (article['title'] ?? 'Article').toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      (article['excerpt'] ?? article['subtitle'] ?? '')
                          .toString(),
                      style: const TextStyle(
                          color: Color(0xFF94A3B8), fontSize: 16),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      (article['content'] ?? '').toString(),
                      style: const TextStyle(
                          color: Color(0xFFE2E8F0), height: 1.6),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Commentaires',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _commentCtrl,
                      maxLines: 3,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Votre commentaire',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _submitting ? null : _addComment,
                      child: Text(
                          _submitting ? 'Envoi...' : 'Publier le commentaire'),
                    ),
                    const SizedBox(height: 16),
                    ..._comments.map(
                      (comment) => Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (comment['author_name'] ??
                                      comment['user_name'] ??
                                      'Utilisateur')
                                  .toString(),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              (comment['content'] ?? comment['message'] ?? '')
                                  .toString(),
                              style: const TextStyle(color: Color(0xFFCBD5E1)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
