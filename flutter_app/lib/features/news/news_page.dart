import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/dio_client.dart';

class NewsPage extends StatefulWidget {
  const NewsPage({super.key});

  @override
  State<NewsPage> createState() => _NewsPageState();
}

class _NewsPageState extends State<NewsPage> {
  List<Map<String, dynamic>> _articles = [];
  List<Map<String, dynamic>> _trending = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/news', queryParameters: {'page': 1, 'limit': 20}),
        ApiClient.dio.get('/news/trending'),
      ]);
      if (!mounted) return;
      final articlesPayload = responses[0].data['data'];
      final articles = articlesPayload is Map<String, dynamic>
          ? articlesPayload['articles']
          : articlesPayload;
      final trendingPayload = responses[1].data['data'];
      final trending = trendingPayload is Map<String, dynamic>
          ? trendingPayload['articles'] ?? trendingPayload['items']
          : trendingPayload;
      setState(() {
        _articles =
            List<Map<String, dynamic>>.from(articles as List? ?? const []);
        _trending =
            List<Map<String, dynamic>>.from(trending as List? ?? const []);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _openArticle(Map<String, dynamic> article) {
    final id = (article['id'] ?? article['slug'] ?? '').toString();
    if (id.isEmpty) return;
    context.push('/news/$id');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Actualités'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_trending.isNotEmpty) ...[
                    const Text(
                      'Tendances',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 220,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _trending.length.clamp(0, 8),
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (_, index) {
                          final article = _trending[index];
                          return _TrendingCard(
                            article: article,
                            onTap: () => _openArticle(article),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  const Text(
                    'Derniers articles',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._articles.map((article) => _ArticleListTile(
                        article: article,
                        onTap: () => _openArticle(article),
                      )),
                ],
              ),
            ),
    );
  }
}

class _TrendingCard extends StatelessWidget {
  const _TrendingCard({required this.article, required this.onTap});

  final Map<String, dynamic> article;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl =
        (article['featured_image'] ?? article['cover_image'] ?? '').toString();
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 280,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl.isNotEmpty)
                CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover)
              else
                Container(color: const Color(0xFF1E293B)),
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.85),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (article['category'] ?? 'news').toString(),
                      style: const TextStyle(color: Color(0xFFF97316)),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      (article['title'] ?? 'Article').toString(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ArticleListTile extends StatelessWidget {
  const _ArticleListTile({required this.article, required this.onTap});

  final Map<String, dynamic> article;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl =
        (article['featured_image'] ?? article['cover_image'] ?? '').toString();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.all(12),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            width: 72,
            height: 72,
            child: imageUrl.isNotEmpty
                ? CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover)
                : Container(color: const Color(0xFF1E293B)),
          ),
        ),
        title: Text(
          (article['title'] ?? 'Article').toString(),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            (article['excerpt'] ?? article['subtitle'] ?? '').toString(),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF94A3B8)),
          ),
        ),
      ),
    );
  }
}
