class Product {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String currency;
  final String? imageUrl;
  final int stock;
  final String sellerId;
  final String? sellerName;

  const Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.currency = 'XOF',
    this.imageUrl,
    this.stock = 0,
    required this.sellerId,
    this.sellerName,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'].toString(),
        name: j['name'] as String,
        description: j['description'] as String?,
        price: (j['price'] as num).toDouble(),
        currency: j['currency'] as String? ?? 'XOF',
        imageUrl: j['image_url'] as String?,
        stock: j['stock'] as int? ?? 0,
        sellerId: j['seller_id'].toString(),
        sellerName: j['seller_name'] as String?,
      );

  bool get inStock => stock > 0;

  String get formattedPrice => '${price.toStringAsFixed(0)} $currency';
}
