import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api/dio_client.dart';
import '../../core/theme/theme.dart';

class CartCheckoutPage extends StatefulWidget {
  const CartCheckoutPage({super.key});

  @override
  State<CartCheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CartCheckoutPage> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _processing = false;
  double _total = 0;
  String _method = 'card'; // 'card' | 'orange_money' | 'wave'

  final _addressCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCart();
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCart() async {
    try {
      final res = await ApiClient.dio.get('/cart');
      final data = res.data['data'] as Map<String, dynamic>;
      final items = (data['items'] as List? ?? []).cast<Map<String, dynamic>>();
      final total = (data['total'] as num?)?.toDouble() ?? 0;
      if (!mounted) return;
      setState(() {
        _items = items;
        _total = total;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _placeOrder() async {
    if (_addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Veuillez saisir une adresse de livraison')),
      );
      return;
    }
    if (_method != 'card' && _phoneCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Veuillez saisir votre numéro de téléphone')),
      );
      return;
    }

    setState(() => _processing = true);
    try {
      final res = await ApiClient.dio.post('/orders', data: {
        'payment_method': _method,
        'delivery_address': _addressCtrl.text.trim(),
        if (_phoneCtrl.text.isNotEmpty) 'phone': _phoneCtrl.text.trim(),
      });
      final data = res.data['data'] as Map<String, dynamic>;

      if (_method == 'card') {
        // Stripe — ouvrir WebView avec checkout URL
        final checkoutUrl = data['checkout_url'] as String?;
        if (checkoutUrl != null && mounted) {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => _StripeWebView(
                url: checkoutUrl,
                onSuccess: () =>
                    _onPaymentSuccess(data['order_id']?.toString()),
                onCancel: () {},
              ),
            ),
          );
        }
      } else {
        // Orange Money / Wave — paiement mobile initié, attente confirmation
        _onPaymentSuccess(data['order_id']?.toString());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _onPaymentSuccess(String? orderId) {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('Commande confirmée !',
            style: TextStyle(color: Colors.white)),
        content: const Text(
          'Votre commande a été passée avec succès. Vous recevrez une confirmation par notification.',
          style: TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.go(orderId != null ? '/orders/$orderId' : '/orders');
            },
            child: const Text('Voir ma commande',
                style: TextStyle(color: AfriWonderTheme.primary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AfriWonderTheme.surface,
      appBar: AppBar(title: const Text('Paiement')),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AfriWonderTheme.primary))
          : _items.isEmpty
              ? const Center(
                  child: Text('Panier vide',
                      style: TextStyle(color: Color(0xFF64748B))))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Récap articles
                      _section('Récapitulatif'),
                      ..._items.map(_buildItem),
                      const Divider(color: Color(0xFF1E293B), height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16)),
                          Text(
                            '${_total.toStringAsFixed(0)} FCFA',
                            style: const TextStyle(
                                color: AfriWonderTheme.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 18),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Adresse
                      _section('Adresse de livraison'),
                      TextField(
                        controller: _addressCtrl,
                        style: const TextStyle(color: Colors.white),
                        maxLines: 2,
                        decoration: const InputDecoration(
                          hintText: 'Ex: Rue 123, Bamako, Mali',
                          hintStyle: TextStyle(color: Color(0xFF64748B)),
                        ),
                        onChanged: (_) {},
                      ),
                      const SizedBox(height: 24),

                      // Mode de paiement
                      _section('Mode de paiement'),
                      _buildPaymentMethod(
                        value: 'card',
                        label: 'Carte bancaire (Stripe)',
                        icon: Icons.credit_card,
                      ),
                      _buildPaymentMethod(
                        value: 'orange_money',
                        label: 'Orange Money',
                        icon: Icons.phone_android,
                        color: const Color(0xFFFF6600),
                      ),
                      _buildPaymentMethod(
                        value: 'wave',
                        label: 'Wave',
                        icon: Icons.waves,
                        color: const Color(0xFF1A9CF4),
                      ),

                      if (_method != 'card') ...[
                        const SizedBox(height: 16),
                        TextField(
                          controller: _phoneCtrl,
                          style: const TextStyle(color: Colors.white),
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            hintText: '+223 7X XX XX XX',
                            hintStyle: TextStyle(color: Color(0xFF64748B)),
                            labelText: 'Numéro de téléphone',
                          ),
                          onChanged: (_) {},
                        ),
                      ],

                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: _processing ? null : _placeOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AfriWonderTheme.primary,
                          minimumSize: const Size(double.infinity, 52),
                        ),
                        child: _processing
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text('Confirmer la commande',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white)),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(title,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16)),
      );

  Widget _buildItem(Map<String, dynamic> item) {
    final name = item['product']?['name'] as String? ?? 'Produit';
    final price = (item['price'] as num?)?.toDouble() ?? 0;
    final qty = (item['quantity'] as num?)?.toInt() ?? 1;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text('$name × $qty',
                style: const TextStyle(color: Color(0xFFCBD5E1))),
          ),
          Text('${(price * qty).toStringAsFixed(0)} FCFA',
              style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildPaymentMethod({
    required String value,
    required String label,
    required IconData icon,
    Color color = AfriWonderTheme.primary,
  }) {
    final selected = _method == value;
    return GestureDetector(
      onTap: () => setState(() => _method = value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? AfriWonderTheme.primary.withValues(alpha: 0.1)
              : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AfriWonderTheme.primary : const Color(0xFF1E293B),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? color : const Color(0xFF64748B)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label,
                  style: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF94A3B8),
                      fontWeight:
                          selected ? FontWeight.w600 : FontWeight.normal)),
            ),
            if (selected) Icon(Icons.check_circle, color: color, size: 20),
          ],
        ),
      ),
    );
  }
}

class _StripeWebView extends StatefulWidget {
  final String url;
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  const _StripeWebView({
    required this.url,
    required this.onSuccess,
    required this.onCancel,
  });

  @override
  State<_StripeWebView> createState() => _StripeWebViewState();
}

class _StripeWebViewState extends State<_StripeWebView> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (req) {
          if (req.url.contains('success') ||
              req.url.contains('payment_success')) {
            Navigator.pop(context);
            widget.onSuccess();
            return NavigationDecision.prevent;
          }
          if (req.url.contains('cancel') ||
              req.url.contains('payment_cancel')) {
            Navigator.pop(context);
            widget.onCancel();
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Paiement sécurisé'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            Navigator.pop(context);
            widget.onCancel();
          },
        ),
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
