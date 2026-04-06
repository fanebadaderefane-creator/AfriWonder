class CartSummary {
  final double subtotal;
  final double couponDiscount;
  final List<CartItem> items;

  const CartSummary({
    required this.subtotal,
    required this.couponDiscount,
    required this.items,
  });

  factory CartSummary.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return CartSummary(
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      couponDiscount: (json['coupon_discount'] as num?)?.toDouble() ?? 0,
      items: rawItems is List
          ? rawItems
              .whereType<Map<String, dynamic>>()
              .map(CartItem.fromJson)
              .toList()
          : const [],
    );
  }
}

class CartItem {
  final String productId;
  final String name;
  final double price;
  final int quantity;
  final String? imageUrl;
  final String? sellerId;

  const CartItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.quantity,
    this.imageUrl,
    this.sellerId,
  });

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      productId: (json['productId'] ?? '').toString(),
      name: (json['name'] ?? 'Produit').toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      imageUrl: json['image']?.toString(),
      sellerId: json['sellerId']?.toString(),
    );
  }

  double get lineTotal => price * quantity;
}

class CartBreakdown {
  final List<CartFeeBySeller> feesBySeller;
  final double totalFees;

  const CartBreakdown({
    required this.feesBySeller,
    required this.totalFees,
  });

  factory CartBreakdown.fromJson(Map<String, dynamic> json) {
    final rawFees = json['feesBySeller'];
    return CartBreakdown(
      feesBySeller: rawFees is List
          ? rawFees
              .whereType<Map<String, dynamic>>()
              .map(CartFeeBySeller.fromJson)
              .toList()
          : const [],
      totalFees: (json['totalFees'] as num?)?.toDouble() ?? 0,
    );
  }
}

class CartFeeBySeller {
  final String sellerId;
  final double subtotal;
  final double platformFee;
  final double sellerAmount;
  final int itemCount;
  final String? storeName;
  final String? phone;
  final String? whatsapp;

  const CartFeeBySeller({
    required this.sellerId,
    required this.subtotal,
    required this.platformFee,
    required this.sellerAmount,
    required this.itemCount,
    this.storeName,
    this.phone,
    this.whatsapp,
  });

  factory CartFeeBySeller.fromJson(Map<String, dynamic> json) {
    return CartFeeBySeller(
      sellerId: (json['sellerId'] ?? '').toString(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      platformFee: (json['platformFee'] as num?)?.toDouble() ?? 0,
      sellerAmount: (json['sellerAmount'] as num?)?.toDouble() ?? 0,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
      storeName: json['store_name']?.toString(),
      phone: json['phone']?.toString(),
      whatsapp: json['whatsapp']?.toString(),
    );
  }
}
