// Types pour AfriWonder Marketplace
export interface Store {
  id: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  rating: number;
  productsCount: number;
  location: string;
  verified: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory: string;
  rating: number;
  reviewCount: number;
  stock: number;
  status: "active" | "inactive" | "sold_out";
  type: "physical" | "digital";
  storeId: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
}

export interface LiveStream {
  id: string;
  title: string;
  creatorName: string;
  creatorAvatar: string;
  thumbnail: string;
  status: "live" | "ended" | "scheduled";
  viewersCount: number;
  likesCount: number;
  giftsValue: number;
  category: string;
  isBattle: boolean;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  valueCoins: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface CoinPackage {
  id: string;
  amountCoins: number;
  bonusCoins: number;
  priceCfa: number;
  popular: boolean;
}

export interface VIPLevel {
  name: string;
  minCoins: number;
  commissionPercent: number;
  badgeColor: string;
}
