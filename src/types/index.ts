export interface Product {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  base_price: number | null;
  has_variants: boolean;
  tags: string[];
  created_at: string;
  variants?: ProductVariant[];
  categories?: Category[];
  product_categories?: { category_id: string; categories: Category }[];
  product_images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  price: number;
  stock: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface CartItem {
  cartId: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  price: number; // stored in NGN
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  amount_paid: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  price: number;
  product_title: string | null;
  variant_info: string | null;
}

export interface DeliveryZone {
  id: string;
  state: string;
  city: string;
  rate: number; // in NGN
  is_active: boolean;
  created_at: string;
}

export interface AdminSettings {
  adminEmail: string;
  whatsappNumber: string;
  storeName: string;
  storeTagline: string;
}
