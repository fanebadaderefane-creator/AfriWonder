import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/dio_client.dart';
import '../../shared/models/cart.dart';
import '../../shared/models/product.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/skeleton_loader.dart';

class MarketplacePage extends StatefulWidget {
  const MarketplacePage({super.key});

  @override
  State<MarketplacePage> createState() => _MarketplacePageState();
}

class _MarketplacePageState extends State<MarketplacePage> {
  List<Product> _products = [];
  bool _loading = true;
  String _category = 'all';
  int _cartCount = 0;

  static const _categories = [
    ('all', 'Tout'),
    ('fashion', 'Mode'),
    ('electronics', 'Électronique'),
    ('food', 'Alimentation'),
    ('beauty', 'Beauté'),
    ('home', 'Maison'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.dio.get(
        '/products',
        queryParameters: {
          if (_category != 'all') 'category': _category,
          'limit': 30,
        },
      );
      dynamic cartData;
      try {
        final cartRes = await ApiClient.dio.get('/cart');
        cartData = cartRes.data['data'];
      } catch (_) {
        cartData = null;
      }
      setState(() {
        _products = (res.data['data'] as List)
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList();
        _cartCount = cartData is Map<String, dynamic>
            ? CartSummary.fromJson(cartData)
                .items
                .fold<int>(0, (sum, item) => sum + item.quantity)
            : 0;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Marketplace',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite_border_rounded),
            onPressed: () => context.push('/wishlist'),
          ),
          IconButton(
            icon: Badge(
              isLabelVisible: _cartCount > 0,
              label: Text('$_cartCount'),
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            onPressed: () => context.push('/cart'),
          ),
          IconButton(
            icon: const Icon(Icons.receipt_long_outlined),
            onPressed: () => context.push('/orders'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Catégories
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _categories.length,
              itemBuilder: (_, i) {
                final (id, label) = _categories[i];
                final selected = _category == id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(label),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _category = id);
                      _load();
                    },
                    backgroundColor: const Color(0xFF1E293B),
                    selectedColor: const Color(0xFF2563EB),
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF94A3B8),
                    ),
                    side: BorderSide.none,
                  ),
                );
              },
            ),
          ),
          // Grille produits
          Expanded(
            child: _loading
                ? GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: 6,
                    itemBuilder: (_, __) =>
                        const SkeletonBox(height: 220, radius: 12),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: _products.length,
                    itemBuilder: (_, i) => _ProductCard(product: _products[i]),
                  ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () => context.push('/marketplace/product/${product.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
                child: product.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: product.imageUrl!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      )
                    : const ColoredBox(
                        color: Color(0xFF1E293B),
                        child: Center(
                            child: Icon(Icons.image_outlined,
                                color: Color(0xFF94A3B8))),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w600),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.formattedPrice,
                    style: const TextStyle(
                        color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
