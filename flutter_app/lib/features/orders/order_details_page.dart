import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/order.dart';

class OrderDetailsPage extends StatefulWidget {
  final String orderId;

  const OrderDetailsPage({super.key, required this.orderId});

  @override
  State<OrderDetailsPage> createState() => _OrderDetailsPageState();
}

class _OrderDetailsPageState extends State<OrderDetailsPage> {
  OrderSummary? _order;
  Map<String, dynamic>? _shipping;
  List<Map<String, dynamic>> _shipmentTimeline = const [];
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final orderRes = await ApiClient.dio.get('/orders/${widget.orderId}');
      dynamic shippingData;
      dynamic shipmentData;

      try {
        final shippingRes =
            await ApiClient.dio.get('/shipping/order/${widget.orderId}');
        shippingData = shippingRes.data['data'];
      } catch (_) {
        shippingData = null;
      }

      try {
        final shipmentRes =
            await ApiClient.dio.get('/shipments/${widget.orderId}/timeline');
        shipmentData = shipmentRes.data['data'];
      } catch (_) {
        shipmentData = null;
      }

      final data = orderRes.data['data'];
      if (!mounted) return;
      setState(() {
        _order =
            data is Map<String, dynamic> ? OrderSummary.fromJson(data) : null;
        _shipping = shippingData is Map<String, dynamic> ? shippingData : null;
        _shipmentTimeline = shipmentData is Map<String, dynamic> &&
                shipmentData['timeline'] is List
            ? (shipmentData['timeline'] as List)
                .whereType<Map<String, dynamic>>()
                .toList()
            : const [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _runAction(
      Future<void> Function() action, String successMessage) async {
    setState(() => _actionLoading = true);
    try {
      await action();
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(successMessage),
          backgroundColor: const Color(0xFF2563EB),
        ),
      );
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
        setState(() => _actionLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF020617),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF2563EB)),
        ),
      );
    }

    if (order == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF020617),
        appBar: AppBar(
          backgroundColor: const Color(0xFF020617),
          title: const Text('Commande'),
        ),
        body: const Center(
          child: Text(
            'Commande introuvable',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    final canCancel = order.status == 'pending';
    final canConfirmReception =
        order.status == 'shipped' || order.status == 'in_transit';
    final shipping = _shipping;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Detail commande'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Commande #${order.id.substring(0, order.id.length > 8 ? 8 : order.id.length)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text('Statut: ${order.status}',
                    style: const TextStyle(color: Colors.white70)),
                const SizedBox(height: 4),
                Text('Paiement: ${order.paymentStatus}',
                    style: const TextStyle(color: Colors.white70)),
                const SizedBox(height: 4),
                Text('Total: ${order.formattedTotal}',
                    style: const TextStyle(color: Color(0xFF2563EB))),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Articles',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ...order.items.map((item) => Container(
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
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                            )
                          : Container(
                              width: 64,
                              height: 64,
                              color: const Color(0xFF1E293B),
                              child: const Icon(Icons.inventory_2_outlined,
                                  color: Colors.white54),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.productName ?? 'Produit',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Quantite: ${item.quantity}',
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${item.formattedLineTotal} ${order.currency}',
                      style: const TextStyle(
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              )),
          if (shipping != null) ...[
            const SizedBox(height: 16),
            const Text(
              'Livraison',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (shipping['carrier'] != null)
                    Text(
                      'Transporteur: ${shipping['carrier']}',
                      style: const TextStyle(color: Colors.white),
                    ),
                  if (shipping['tracking_number'] != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Tracking: ${shipping['tracking_number']}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                  if (shipping['status'] != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Statut livraison: ${shipping['status']}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                  if (shipping['shipping_address'] != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Adresse: ${shipping['shipping_address']}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ],
              ),
            ),
          ],
          if (_shipmentTimeline.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Timeline expedition',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._shipmentTimeline.map((event) => Container(
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
                        (event['event_type'] ?? 'event').toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (event['description'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          event['description'].toString(),
                          style: const TextStyle(color: Colors.white70),
                        ),
                      ],
                      if (event['location'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Lieu: ${event['location']}',
                          style: const TextStyle(color: Colors.white70),
                        ),
                      ],
                      if (event['timestamp'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          event['timestamp'].toString(),
                          style: const TextStyle(
                              color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                )),
          ],
          if (canCancel || canConfirmReception) ...[
            const SizedBox(height: 8),
            if (canCancel)
              OutlinedButton(
                onPressed: _actionLoading
                    ? null
                    : () => _runAction(
                          () => ApiClient.dio
                              .post('/orders/${order.id}/cancel', data: {}),
                          'Commande annulee',
                        ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.redAccent,
                  side: const BorderSide(color: Colors.redAccent),
                  minimumSize: const Size(double.infinity, 52),
                ),
                child: const Text('Annuler la commande'),
              ),
            if (canConfirmReception)
              ElevatedButton(
                onPressed: _actionLoading
                    ? null
                    : () => _runAction(
                          () => ApiClient.dio.post(
                              '/orders/${order.id}/confirm-reception',
                              data: {}),
                          'Reception confirmee',
                        ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  minimumSize: const Size(double.infinity, 52),
                ),
                child: const Text('Confirmer la reception'),
              ),
          ],
        ],
      ),
    );
  }
}
