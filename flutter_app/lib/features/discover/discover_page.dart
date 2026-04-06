import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/dio_client.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/premium_ui.dart';
import '../../shared/widgets/skeleton_loader.dart';

class DiscoverPage extends StatefulWidget {
  const DiscoverPage({super.key});

  @override
  State<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends State<DiscoverPage> {
  static const _categories = [
    'all',
    'trending',
    'musique',
    'danse',
    'cuisine',
    'mode',
    'business',
    'education',
    'sport',
  ];

  final _search = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  List<Map<String, dynamic>> _trending = [];
  List<Map<String, dynamic>> _creators = [];
  List<Map<String, dynamic>> _products = [];
  bool _loading = true;
  bool _searching = false;
  String _selectedCategory = 'all';

  @override
  void initState() {
    super.initState();
    _loadTrending();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadTrending() async {
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/search/trending'),
        ApiClient.dio
            .get('/leaderboard', queryParameters: {'range': 'all', 'limit': 8}),
        ApiClient.dio.get('/products', queryParameters: {'limit': 8}),
      ]);
      final trendingRes = responses[0];
      final leaderboardRes = responses[1];
      final productsRes = responses[2];
      final leaderboardPayload =
          leaderboardRes.data['leaderboard'] as List? ?? const [];
      final productsPayload = productsRes.data['data'];
      final products = productsPayload is List
          ? productsPayload
          : (productsPayload is Map<String, dynamic>
              ? productsPayload['products']
              : const []);
      setState(() {
        _trending = List<Map<String, dynamic>>.from(
            trendingRes.data['data'] as List? ?? const []);
        _creators = List<Map<String, dynamic>>.from(leaderboardPayload);
        _products =
            List<Map<String, dynamic>>.from(products as List? ?? const []);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _doSearch(String q) async {
    if (q.trim().isEmpty) {
      setState(() {
        _results = [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    try {
      final res = await ApiClient.dio
          .get('/search', queryParameters: {'q': q, 'limit': 30});
      setState(() {
        _results = List<Map<String, dynamic>>.from(res.data['data'] as List);
        _searching = false;
      });
    } catch (_) {
      setState(() => _searching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayedTrending = _selectedCategory == 'all'
        ? _trending
        : _trending
            .where((item) =>
                (item['category'] ?? '').toString() == _selectedCategory)
            .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Discover'),
        actions: [
          IconButton(
            onPressed: () => context.push('/news'),
            icon: const Icon(Icons.newspaper_outlined),
            tooltip: 'Actualités',
          ),
        ],
      ),
      body: _searching
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2563EB)))
          : _results.isNotEmpty
              ? ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                  children: [
                    PremiumSearchField(
                      controller: _search,
                      hintText: 'Rechercher créateurs, vidéos, produits...',
                      onSubmitted: _doSearch,
                      onChanged: (_) => setState(() {}),
                      suffixIcon: _search.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear,
                                  color: Color(0xFF94A3B8)),
                              onPressed: () {
                                _search.clear();
                                _doSearch('');
                              },
                            )
                          : null,
                    ),
                    const SizedBox(height: 18),
                    PremiumSurface(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const PremiumSectionHeader(
                            title: 'Search results',
                            subtitle:
                                'Contenu trouvé dans tout l’écosystème AfriWonder',
                          ),
                          const SizedBox(height: 16),
                          SizedBox(height: 420, child: _buildGrid(_results)),
                        ],
                      ),
                    ),
                  ],
                )
              : _loading
                  ? _buildSkeletonGrid()
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                      children: [
                        PremiumSearchField(
                          controller: _search,
                          hintText: 'Rechercher créateurs, vidéos, produits...',
                          onSubmitted: _doSearch,
                          onChanged: (_) => setState(() {}),
                          suffixIcon: _search.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear,
                                      color: Color(0xFF94A3B8)),
                                  onPressed: () {
                                    _search.clear();
                                    _doSearch('');
                                  },
                                )
                              : null,
                        ),
                        const SizedBox(height: 18),
                        PremiumSurface(child: _buildCategoryRow()),
                        const SizedBox(height: 18),
                        PremiumSurface(
                            child: _buildTrending(displayedTrending)),
                        const SizedBox(height: 18),
                        PremiumSurface(child: _buildCreators()),
                        const SizedBox(height: 18),
                        PremiumSurface(child: _buildProducts()),
                      ],
                    ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }

  Widget _buildCategoryRow() {
    return SizedBox(
      height: 42,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: _categories.map((category) {
          final selected = category == _selectedCategory;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: PremiumChoiceChip(
              label: category == 'all' ? 'Tous' : category,
              selected: selected,
              onTap: () => setState(() => _selectedCategory = category),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTrending(List<Map<String, dynamic>> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PremiumSectionHeader(
          title: 'Tendances',
          subtitle: 'Les vidéos qui montent en ce moment',
        ),
        const SizedBox(height: 16),
        SizedBox(height: 320, child: _buildGrid(items)),
      ],
    );
  }

  Widget _buildCreators() {
    if (_creators.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PremiumSectionHeader(
          title: 'Créateurs à suivre',
          subtitle: 'Profils qui performent et inspirent la communauté',
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 98,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _creators.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, index) {
              final creator = _creators[index];
              final avatar = (creator['user_avatar'] ?? '').toString();
              return GestureDetector(
                onTap: () => context.push('/profile/${creator['user_id']}'),
                child: SizedBox(
                  width: 88,
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: const Color(0xFFF97316), width: 1.8),
                        ),
                        child: CircleAvatar(
                          radius: 28,
                          backgroundImage: avatar.isNotEmpty
                              ? CachedNetworkImageProvider(avatar)
                              : null,
                          child:
                              avatar.isEmpty ? const Icon(Icons.person) : null,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        (creator['user_name'] ?? 'User').toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style:
                            const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProducts() {
    if (_products.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PremiumSectionHeader(
          title: 'Marketplace',
          subtitle: 'Sélection e-commerce intégrée à l’expérience sociale',
        ),
        const SizedBox(height: 14),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.74,
          ),
          itemCount: _products.length,
          itemBuilder: (_, index) {
            final product = _products[index];
            final images = product['images'] as List?;
            final firstImage =
                images != null && images.isNotEmpty ? images.first : '';
            final imageUrl =
                (product['image_url'] ?? firstImage ?? '').toString();
            return GestureDetector(
              onTap: () =>
                  context.push('/marketplace/product/${product['id']}'),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF121C2C),
                  borderRadius: BorderRadius.circular(18),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: imageUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              width: double.infinity,
                            )
                          : Container(color: const Color(0xFF1E293B)),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (product['name'] ?? 'Produit').toString(),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${product['price'] ?? 0} ${product['currency'] ?? 'XOF'}',
                            style: const TextStyle(color: Color(0xFFF97316)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildGrid(List<Map<String, dynamic>> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(1),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 1,
        mainAxisSpacing: 1,
        childAspectRatio: 9 / 16,
      ),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        final vid =
            item['id']?.toString() ?? item['video_id']?.toString() ?? '';
        return GestureDetector(
          onTap: () {
            if (vid.isNotEmpty) context.push('/video/$vid');
          },
          child: CachedNetworkImage(
            imageUrl: item['thumbnail_url'] as String? ?? '',
            fit: BoxFit.cover,
            placeholder: (_, __) => const SkeletonBox(radius: 0),
            errorWidget: (_, __, ___) =>
                const ColoredBox(color: Color(0xFF1E293B)),
          ),
        );
      },
    );
  }

  Widget _buildSkeletonGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(1),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 1,
        mainAxisSpacing: 1,
        childAspectRatio: 9 / 16,
      ),
      itemCount: 12,
      itemBuilder: (_, __) => const SkeletonBox(radius: 0),
    );
  }
}
