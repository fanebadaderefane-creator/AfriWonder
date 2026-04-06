import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../core/theme/theme.dart';
import '../../shared/widgets/bottom_nav.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage>
    with SingleTickerProviderStateMixin {
  final _ctrl = TextEditingController();
  late final TabController _tabs;
  Timer? _debounce;

  String _query = '';
  bool _loading = false;

  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _videos = [];
  List<Map<String, dynamic>> _products = [];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _tabs.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (value.trim() == _query) return;
      setState(() => _query = value.trim());
      if (_query.length >= 2) _search(_query);
    });
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.dio
            .get('/search/users', queryParameters: {'q': q, 'limit': 20}),
        ApiClient.dio
            .get('/search/videos', queryParameters: {'q': q, 'limit': 20}),
        ApiClient.dio
            .get('/search/products', queryParameters: {'q': q, 'limit': 20}),
      ]);
      if (!mounted) return;
      setState(() {
        _users = List<Map<String, dynamic>>.from(results[0].data['data'] ?? []);
        _videos =
            List<Map<String, dynamic>>.from(results[1].data['data'] ?? []);
        _products =
            List<Map<String, dynamic>>.from(results[2].data['data'] ?? []);
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AfriWonderTheme.surface,
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Rechercher...',
            hintStyle: const TextStyle(color: Color(0xFF64748B)),
            border: InputBorder.none,
            prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
            suffixIcon: _query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                    onPressed: () {
                      _ctrl.clear();
                      setState(() {
                        _query = '';
                        _users = _videos = _products = [];
                      });
                    },
                  )
                : null,
          ),
          onChanged: _onChanged,
        ),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AfriWonderTheme.primary,
          labelColor: AfriWonderTheme.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          tabs: const [
            Tab(text: 'Utilisateurs'),
            Tab(text: 'Vidéos'),
            Tab(text: 'Produits'),
          ],
        ),
      ),
      body: _query.length < 2
          ? _buildEmptyState()
          : _loading
              ? const Center(
                  child:
                      CircularProgressIndicator(color: AfriWonderTheme.primary))
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildUserList(),
                    _buildVideoList(),
                    _buildProductList(),
                  ],
                ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }

  Widget _buildEmptyState() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search,
                size: 64, color: Colors.white.withValues(alpha: 0.2)),
            const SizedBox(height: 16),
            const Text(
              'Tapez au moins 2 caractères',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ],
        ),
      );

  Widget _buildUserList() {
    if (_users.isEmpty) return _noResult('Aucun utilisateur trouvé');
    return ListView.builder(
      itemCount: _users.length,
      itemBuilder: (_, i) {
        final u = _users[i];
        return ListTile(
          leading: CircleAvatar(
            backgroundImage: u['avatar_url'] != null
                ? CachedNetworkImageProvider(u['avatar_url'] as String)
                : null,
            backgroundColor: AfriWonderTheme.primary.withValues(alpha: 0.2),
            child: u['avatar_url'] == null
                ? Text(
                    (u['username'] as String? ?? '?')[0].toUpperCase(),
                    style: const TextStyle(color: AfriWonderTheme.primary),
                  )
                : null,
          ),
          title: Text(u['full_name'] as String? ?? '',
              style: const TextStyle(color: Colors.white)),
          subtitle: Text('@${u['username'] ?? ''}',
              style: const TextStyle(color: Color(0xFF64748B))),
          trailing: u['is_verified'] == true
              ? const Icon(Icons.verified,
                  color: AfriWonderTheme.primary, size: 16)
              : null,
          onTap: () => context.push('/profile/${u['id']}'),
        );
      },
    );
  }

  Widget _buildVideoList() {
    if (_videos.isEmpty) return _noResult('Aucune vidéo trouvée');
    return GridView.builder(
      padding: const EdgeInsets.all(4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 9 / 16,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: _videos.length,
      itemBuilder: (_, i) {
        final v = _videos[i];
        final videoId = v['id']?.toString() ?? v['video_id']?.toString() ?? '';
        return GestureDetector(
          onTap: () {
            if (videoId.isNotEmpty) {
              context.push('/video/$videoId');
            }
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (v['thumbnail_url'] != null)
                CachedNetworkImage(
                  imageUrl: v['thumbnail_url'] as String,
                  fit: BoxFit.cover,
                )
              else
                Container(color: const Color(0xFF0F172A)),
              Positioned(
                bottom: 4,
                left: 4,
                child: Row(
                  children: [
                    const Icon(Icons.play_arrow, color: Colors.white, size: 14),
                    Text(
                      '${v['views_count'] ?? 0}',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProductList() {
    if (_products.isEmpty) return _noResult('Aucun produit trouvé');
    return ListView.builder(
      itemCount: _products.length,
      itemBuilder: (_, i) {
        final p = _products[i];
        return ListTile(
          leading: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: p['image_url'] != null
                ? CachedNetworkImage(
                    imageUrl: p['image_url'] as String,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                  )
                : Container(
                    width: 56,
                    height: 56,
                    color: const Color(0xFF0F172A),
                    child: const Icon(Icons.inventory_2_outlined,
                        color: Color(0xFF64748B)),
                  ),
          ),
          title: Text(p['name'] as String? ?? '',
              style: const TextStyle(color: Colors.white)),
          subtitle: Text(
            '${p['price'] ?? '0'} FCFA',
            style: const TextStyle(color: AfriWonderTheme.primary),
          ),
          onTap: () => context.push('/marketplace/product/${p['id']}'),
        );
      },
    );
  }

  Widget _noResult(String msg) => Center(
        child: Text(msg, style: const TextStyle(color: Color(0xFF64748B))),
      );
}
