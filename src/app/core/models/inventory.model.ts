export interface Product {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  barcode?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id?: string;
  productId: string;
  product: Product;
  warehouseId: string;
  zoneId?: string;
  rackId?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  lastUpdated: Date;
  location: string;
  batchNumber?: string;
  expiryDate?: Date;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
}

export interface StockMovement {
  id?: string;
  productId: string;
  product: Product;
  warehouseId: string;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string; // Order ID, Transfer ID, etc.
  userId: string;
  userName: string;
  timestamp: Date;
  notes?: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
