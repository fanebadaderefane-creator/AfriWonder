class OrderSummary {
  final String id;
  final String status;
  final String paymentStatus;
  final double totalAmount;
  final double subtotalAmount;
  final String currency;
  final String createdAt;
  final String? sellerId;
  final List<OrderLine> items;

  const OrderSummary({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.subtotalAmount,
    required this.currency,
    required this.createdAt,
    required this.items,
    this.sellerId,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return OrderSummary(
      id: json['id'].toString(),
      status: (json['status'] ?? 'pending').toString(),
      paymentStatus: (json['payment_status'] ?? 'pending').toString(),
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0,
      subtotalAmount: (json['subtotal_amount'] as num?)?.toDouble() ?? 0,
      currency: (json['currency'] ?? 'XOF').toString(),
      createdAt: (json['created_at'] ?? '').toString(),
      sellerId: json['seller_id']?.toString(),
      items: rawItems is List
          ? rawItems
              .whereType<Map<String, dynamic>>()
              .map(OrderLine.fromJson)
              .toList()
          : const [],
    );
  }

  String get formattedTotal => '${totalAmount.toStringAsFixed(0)} $currency';
}

class OrderLine {
  final String id;
  final String productId;
  final int quantity;
  final double unitPrice;
  final String? productName;
  final String? imageUrl;

  const OrderLine({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    this.productName,
    this.imageUrl,
  });

  factory OrderLine.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    final snapshot = json['product_snapshot'];

    String? readName() {
      if (product is Map<String, dynamic> && product['name'] != null) {
        return product['name'].toString();
      }
      if (snapshot is Map<String, dynamic> && snapshot['name'] != null) {
        return snapshot['name'].toString();
      }
      return null;
    }

    String? readImage() {
      if (product is Map<String, dynamic> && product['image_url'] != null) {
        return product['image_url'].toString();
      }
      if (snapshot is Map<String, dynamic> && snapshot['image_url'] != null) {
        return snapshot['image_url'].toString();
      }
      return null;
    }

    return OrderLine(
      id: json['id'].toString(),
      productId: (json['product_id'] ?? '').toString(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0,
      productName: readName(),
      imageUrl: readImage(),
    );
  }

  String get formattedLineTotal => (unitPrice * quantity).toStringAsFixed(0);
}
