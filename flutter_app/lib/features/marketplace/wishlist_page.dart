import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/widgets/premium_ui.dart';

class WishlistPage extends StatefulWidget {
  const WishlistPage({super.key});

  @override
  State<WishlistPage> createState() => _WishlistPageState();
}

class _WishlistPageState extends State<WishlistPage> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/wishlist');
      final payload = res.data['data'] as Map<String, dynamic>? ?? const {};
      if (!mounted) return;
      setState(() {
        _items = List<Map<String, dynamic>>.from(payload['items'] as List? ??
            payload['wishlist'] as List? ??
            const []);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _remove(String productId) async {
    try {
      await ApiClient.dio.delete('/wishlist/remove/$productId');
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(title: const Text('Wishlist')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Text(
                    'Aucun produit sauvegardé',
                    style: TextStyle(color: Colors.white70),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                  itemCount: _items.length,
                  itemBuilder: (_, index) {
                    final item = _items[index];
                    final product = item['product'] is Map<String, dynamic>
                        ? Map<String, dynamic>.from(item['product'])
                        : item;
                    final image = (product['image_url'] ?? '').toString();
                    return PremiumSurface(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SizedBox(
                            width: 56,
                            height: 56,
                            child: image.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: image, fit: BoxFit.cover)
                                : Container(color: const Color(0xFF1E293B)),
                          ),
                        ),
                        title: Text(
                          (product['name'] ?? 'Produit').toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        subtitle: Text(
                          '${product['price'] ?? 0} ${product['currency'] ?? 'XOF'}',
                          style: const TextStyle(color: Color(0xFF94A3B8)),
                        ),
                        trailing: IconButton(
                          onPressed: () => _remove(product['id'].toString()),
                          icon: const Icon(Icons.favorite,
                              color: Color(0xFFF97316)),
                        ),
                        onTap: () => context
                            .push('/marketplace/product/${product['id']}'),
                      ),
                    );
                  },
                ),
    );
  }
}
