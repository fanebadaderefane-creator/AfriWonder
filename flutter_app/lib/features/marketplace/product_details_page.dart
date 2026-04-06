import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/product.dart';

class ProductDetailsPage extends StatefulWidget {
  final String productId;

  const ProductDetailsPage({super.key, required this.productId});

  @override
  State<ProductDetailsPage> createState() => _ProductDetailsPageState();
}

class _ProductDetailsPageState extends State<ProductDetailsPage> {
  Product? _product;
  bool _loading = true;
  int _quantity = 1;
  bool _isInWishlist = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/products/${widget.productId}');
      Response<dynamic>? checkRes;
      try {
        checkRes =
            await ApiClient.dio.get('/wishlist/check/${widget.productId}');
      } catch (_) {}
      final data = res.data['data'];
      if (!mounted) return;
      setState(() {
        _product = data is Map<String, dynamic> ? Product.fromJson(data) : null;
        _isInWishlist =
            checkRes != null && checkRes.data['data']?['isInWishlist'] == true;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _addToCart() async {
    final product = _product;
    if (product == null) return;

    try {
      await ApiClient.dio.post('/cart/add', data: {
        'productId': product.id,
        'quantity': _quantity,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ajoute au panier'),
          backgroundColor: const Color(0xFF2563EB),
          action: SnackBarAction(
            label: 'Voir',
            textColor: Colors.white,
            onPressed: () => context.push('/cart'),
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Erreur, reessayez'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _buyNow() async {
    final product = _product;
    if (product == null) return;

    try {
      final res = await ApiClient.dio.post('/orders', data: {
        'items': [
          {
            'product_id': product.id,
            'quantity': _quantity,
          },
        ],
      });

      final dynamic orderData = res.data['data'];
      final dynamic orderId =
          orderData is Map<String, dynamic> ? orderData['id'] : null;
      final dynamic checkoutUrl =
          orderData is Map<String, dynamic> ? orderData['payment_url'] : null;

      if (!mounted) return;

      if (checkoutUrl is String && checkoutUrl.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CheckoutPage(
              orderId: orderId?.toString() ?? '',
              checkoutUrl: checkoutUrl,
              amount: product.price * _quantity,
              currency: product.currency,
            ),
          ),
        );
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            orderId != null
                ? 'Commande creee. Le paiement se poursuit hors de l application.'
                : 'Commande creee avec succes',
          ),
          backgroundColor: const Color(0xFF2563EB),
        ),
      );
      if (orderId != null) {
        context.push('/orders/${orderId.toString()}');
      }
    } catch (error) {
      if (!mounted) return;
      final message = error is Exception
          ? error.toString().replaceFirst('Exception: ', '')
          : 'Erreur lors de la commande';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _toggleWishlist() async {
    final product = _product;
    if (product == null) return;
    final previous = _isInWishlist;
    setState(() => _isInWishlist = !_isInWishlist);
    try {
      if (previous) {
        await ApiClient.dio.delete('/wishlist/remove/${product.id}');
      } else {
        await ApiClient.dio
            .post('/wishlist/add', data: {'productId': product.id});
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _isInWishlist = previous);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF020617),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF2563EB)),
        ),
      );
    }

    if (_product == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF020617),
        appBar: AppBar(title: const Text('Produit')),
        body: const Center(
          child: Text(
            'Produit introuvable',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    final product = _product!;
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: const Color(0xFF020617),
            actions: [
              IconButton(
                onPressed: _toggleWishlist,
                icon: Icon(
                  _isInWishlist ? Icons.favorite : Icons.favorite_border,
                  color: _isInWishlist ? const Color(0xFFF97316) : Colors.white,
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: product.imageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: product.imageUrl!,
                      fit: BoxFit.cover,
                    )
                  : const ColoredBox(color: Color(0xFF1E293B)),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.formattedPrice,
                    style: const TextStyle(
                      color: Color(0xFF2563EB),
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.inStock
                        ? 'En stock (${product.stock})'
                        : 'Rupture de stock',
                    style: TextStyle(
                      color: product.inStock ? Colors.green : Colors.red,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (product.description != null) ...[
                    const Text(
                      'Description',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.description!,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  Row(
                    children: [
                      const Text(
                        'Quantite',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(
                          Icons.remove_circle_outline,
                          color: Color(0xFF2563EB),
                        ),
                        onPressed: () {
                          if (_quantity > 1) {
                            setState(() => _quantity--);
                          }
                        },
                      ),
                      Text(
                        '$_quantity',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.add_circle_outline,
                          color: Color(0xFF2563EB),
                        ),
                        onPressed: () {
                          if (_quantity < product.stock) {
                            setState(() => _quantity++);
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: product.inStock ? _addToCart : null,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF2563EB),
                            side: const BorderSide(color: Color(0xFF2563EB)),
                            minimumSize: const Size(double.infinity, 52),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Ajouter au panier'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: product.inStock ? _buyNow : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            minimumSize: const Size(double.infinity, 52),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Acheter maintenant'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CheckoutPage extends StatefulWidget {
  final String orderId;
  final String checkoutUrl;
  final double amount;
  final String currency;

  const CheckoutPage({
    super.key,
    required this.orderId,
    required this.checkoutUrl,
    required this.amount,
    required this.currency,
  });

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onNavigationRequest: (req) {
            if (req.url.contains('/payment/success')) {
              _onPaymentSuccess();
              return NavigationDecision.prevent;
            }
            if (req.url.contains('/payment/cancel') ||
                req.url.contains('/payment/failed')) {
              _onPaymentFailed();
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  void _onPaymentSuccess() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Text('Paiement reussi'),
        content: Text(
          'La commande ${widget.orderId.isEmpty ? '' : '#${widget.orderId} '}a ete payee avec succes.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  void _onPaymentFailed() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Paiement annule ou echoue'),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
            'Paiement ${widget.amount.toStringAsFixed(0)} ${widget.currency}'),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
