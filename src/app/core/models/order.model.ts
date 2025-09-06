export interface Order {
  id?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  billingAddress: Address;
  status: OrderStatus;
  priority: OrderPriority;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  items: OrderItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  expectedDeliveryDate?: Date;
  trackingNumber?: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'picked'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Product {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  unit: string;
  unitPrice: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  barcode?: string;
  imageUrl?: string;
}
