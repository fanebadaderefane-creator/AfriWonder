import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/order.dart';

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String _mode = 'buyer';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.dio.get('/orders', queryParameters: {
        'as': _mode,
        'page': 1,
        'limit': 30,
      });
      final data = res.data['data'];
      final rawOrders = data is Map<String, dynamic> ? data['orders'] : null;

      if (!mounted) return;
      setState(() {
        _orders = rawOrders is List
            ? rawOrders
                .whereType<Map<String, dynamic>>()
                .map(OrderSummary.fromJson)
                .toList()
            : const [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Commandes'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'buyer', label: Text('Achats')),
                ButtonSegment(value: 'seller', label: Text('Ventes')),
              ],
              selected: {_mode},
              onSelectionChanged: (selection) {
                final next = selection.first;
                if (next == _mode) return;
                setState(() => _mode = next);
                _load();
              },
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                  )
                : _orders.isEmpty
                    ? const Center(
                        child: Text(
                          'Aucune commande pour le moment',
                          style: TextStyle(color: Colors.white70),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: _orders.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (_, index) {
                            final order = _orders[index];
                            return _OrderCard(order: order);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderSummary order;

  const _OrderCard({required this.order});

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
      case 'delivered':
        return Colors.green;
      case 'cancelled':
      case 'failed':
        return Colors.redAccent;
      case 'shipped':
      case 'in_transit':
        return Colors.orangeAccent;
      default:
        return const Color(0xFF2563EB);
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstLine = order.items.isNotEmpty ? order.items.first : null;
    return InkWell(
      onTap: () => context.push('/orders/${order.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '#${order.id.substring(0, order.id.length > 8 ? 8 : order.id.length)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor(order.status).withAlpha(40),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    order.status,
                    style: TextStyle(
                      color: _statusColor(order.status),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              firstLine?.productName ?? '${order.items.length} article(s)',
              style: const TextStyle(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 6),
            Text(
              'Paiement: ${order.paymentStatus}',
              style: const TextStyle(color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 4),
            Text(
              order.formattedTotal,
              style: const TextStyle(
                color: Color(0xFF2563EB),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
