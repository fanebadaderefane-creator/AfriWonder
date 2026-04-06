import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/cart.dart';

class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  CartSummary? _cart;
  CartBreakdown? _breakdown;
  final _shippingAddressCtrl = TextEditingController();
  bool _loading = true;
  bool _mutating = false;
  bool _checkoutLoading = false;
  String _paymentMethod = 'orange_money';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _shippingAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/cart'),
        ApiClient.dio.get('/cart/breakdown'),
      ]);
      final cartData = responses[0].data['data'];
      final breakdownData = responses[1].data['data'];
      if (!mounted) return;
      setState(() {
        _cart = cartData is Map<String, dynamic>
            ? CartSummary.fromJson(cartData)
            : null;
        _breakdown = breakdownData is Map<String, dynamic>
            ? CartBreakdown.fromJson(breakdownData)
            : null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _updateQuantity(CartItem item, int nextQuantity) async {
    setState(() => _mutating = true);
    try {
      if (nextQuantity <= 0) {
        await ApiClient.dio.delete('/cart/remove/${item.productId}');
      } else {
        await ApiClient.dio.put('/cart/update', data: {
          'productId': item.productId,
          'quantity': nextQuantity,
        });
      }
      await _load();
    } finally {
      if (mounted) {
        setState(() => _mutating = false);
      }
    }
  }

  Future<void> _clearCart() async {
    setState(() => _mutating = true);
    try {
      await ApiClient.dio.delete('/cart/clear');
      await _load();
    } finally {
      if (mounted) {
        setState(() => _mutating = false);
      }
    }
  }

  Future<void> _checkout() async {
    setState(() => _checkoutLoading = true);
    try {
      final res = await ApiClient.dio.post('/orders',
          data: {
            'payment_method': _paymentMethod,
            'shipping_address': _shippingAddressCtrl.text.trim().isEmpty
                ? null
                : _shippingAddressCtrl.text.trim(),
          }..removeWhere((key, value) => value == null));

      final data = res.data['data'];
      if (!mounted) return;

      if (data is Map<String, dynamic> && data['orders'] is List) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${data['count'] ?? (data['orders'] as List).length} commandes creees'),
            backgroundColor: const Color(0xFF2563EB),
          ),
        );
        context.push('/orders');
        return;
      }

      final orderId =
          data is Map<String, dynamic> ? data['id']?.toString() : null;
      if (orderId != null && orderId.isNotEmpty) {
        context.push('/orders/$orderId');
        return;
      }

      context.push('/orders');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString()),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _checkoutLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = _cart;
    final breakdown = _breakdown;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Panier'),
        actions: [
          if (cart != null && cart.items.isNotEmpty)
            TextButton(
              onPressed: _mutating ? null : _clearCart,
              child: const Text('Vider'),
            ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2563EB)),
            )
          : cart == null || cart.items.isEmpty
              ? const Center(
                  child: Text(
                    'Votre panier est vide',
                    style: TextStyle(color: Colors.white70),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ...cart.items.map((item) => Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: item.imageUrl != null
                                    ? CachedNetworkImage(
                                        imageUrl: item.imageUrl!,
                                        width: 72,
                                        height: 72,
                                        fit: BoxFit.cover,
                                      )
                                    : Container(
                                        width: 72,
                                        height: 72,
                                        color: const Color(0xFF1E293B),
                                        child: const Icon(Icons.image_outlined,
                                            color: Colors.white54),
                                      ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      '${item.price.toStringAsFixed(0)} XOF',
                                      style: const TextStyle(
                                          color: Color(0xFF2563EB)),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        IconButton(
                                          onPressed: _mutating
                                              ? null
                                              : () => _updateQuantity(
                                                  item, item.quantity - 1),
                                          icon: const Icon(
                                              Icons.remove_circle_outline),
                                        ),
                                        Text(
                                          '${item.quantity}',
                                          style: const TextStyle(
                                              color: Colors.white),
                                        ),
                                        IconButton(
                                          onPressed: _mutating
                                              ? null
                                              : () => _updateQuantity(
                                                  item, item.quantity + 1),
                                          icon: const Icon(
                                              Icons.add_circle_outline),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '${item.lineTotal.toStringAsFixed(0)} XOF',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        )),
                    if (breakdown != null &&
                        breakdown.feesBySeller.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Frais par vendeur',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...breakdown.feesBySeller.map((fee) => Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fee.storeName ?? 'Vendeur',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${fee.itemCount} article(s) • commission ${fee.platformFee.toStringAsFixed(0)} XOF',
                                  style: const TextStyle(color: Colors.white70),
                                ),
                              ],
                            ),
                          )),
                    ],
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SummaryRow(
                              label: 'Sous-total',
                              value: '${cart.subtotal.toStringAsFixed(0)} XOF'),
                          if (cart.couponDiscount > 0)
                            _SummaryRow(
                              label: 'Reduction',
                              value:
                                  '-${cart.couponDiscount.toStringAsFixed(0)} XOF',
                            ),
                          if (breakdown != null)
                            _SummaryRow(
                              label: 'Frais plateforme',
                              value:
                                  '${breakdown.totalFees.toStringAsFixed(0)} XOF',
                            ),
                          const Divider(),
                          _SummaryRow(
                            label: 'Total estime',
                            value:
                                '${(cart.subtotal - cart.couponDiscount + (breakdown?.totalFees ?? 0)).toStringAsFixed(0)} XOF',
                            highlighted: true,
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _shippingAddressCtrl,
                            style: const TextStyle(color: Colors.white),
                            maxLines: 2,
                            decoration: InputDecoration(
                              labelText: 'Adresse de livraison',
                              labelStyle:
                                  const TextStyle(color: Colors.white70),
                              hintText: 'Rue, quartier, ville',
                              hintStyle:
                                  const TextStyle(color: Color(0xFF94A3B8)),
                              filled: true,
                              fillColor: const Color(0xFF111827),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            value: _paymentMethod,
                            dropdownColor: const Color(0xFF111827),
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'Paiement',
                              labelStyle:
                                  const TextStyle(color: Colors.white70),
                              filled: true,
                              fillColor: const Color(0xFF111827),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'orange_money',
                                child: Text('Orange Money'),
                              ),
                              DropdownMenuItem(
                                value: 'cash_on_delivery',
                                child: Text('Paiement a la livraison'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value == null) return;
                              setState(() => _paymentMethod = value);
                            },
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _checkoutLoading ? null : _checkout,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              minimumSize: const Size(double.infinity, 52),
                            ),
                            child: Text(
                              _checkoutLoading
                                  ? 'Creation...'
                                  : 'Passer la commande',
                            ),
                          ),
                          const SizedBox(height: 8),
                          OutlinedButton(
                            onPressed: () => context.push('/orders'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Color(0xFF334155)),
                              minimumSize: const Size(double.infinity, 52),
                            ),
                            child: const Text('Voir mes commandes'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool highlighted;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.highlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = highlighted ? const Color(0xFF2563EB) : Colors.white;
    final weight = highlighted ? FontWeight.bold : FontWeight.w500;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
              child:
                  Text(label, style: const TextStyle(color: Colors.white70))),
          Text(value, style: TextStyle(color: color, fontWeight: weight)),
        ],
      ),
    );
  }
}
