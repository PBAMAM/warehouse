export interface Warehouse {
  id?: string;
  name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  capacity: number;
  currentStock: number;
  managerId: string;
  managerName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface WarehouseZone {
  id?: string;
  warehouseId: string;
  name: string;
  description?: string;
  capacity: number;
  currentStock: number;
  temperature?: number;
  humidity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseRack {
  id?: string;
  warehouseId: string;
  zoneId: string;
  name: string;
  description?: string;
  capacity: number;
  currentStock: number;
  level: number;
  position: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
