import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Product, InventoryItem, StockMovement, Category } from '../models/inventory.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private productsCollection: AngularFirestoreCollection<Product>;
  private inventoryCollection: AngularFirestoreCollection<InventoryItem>;
  private movementsCollection: AngularFirestoreCollection<StockMovement>;
  private categoriesCollection: AngularFirestoreCollection<Category>;

  constructor(
    private firestore: AngularFirestore,
    private notificationService: NotificationService
  ) {
    this.productsCollection = this.firestore.collection<Product>('products');
    this.inventoryCollection = this.firestore.collection<InventoryItem>('inventory');
    this.movementsCollection = this.firestore.collection<StockMovement>('stock-movements');
    this.categoriesCollection = this.firestore.collection<Category>('categories');
  }

  // Product CRUD Operations
  getProducts(): Observable<Product[]> {
    return this.productsCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        
        // Convert Firebase Timestamps to JavaScript Date objects
        const product: Product = {
          id,
          sku: data.sku,
          name: data.name,
          description: data.description,
          category: data.category,
          brand: data.brand,
          unit: data.unit,
          unitPrice: data.unitPrice,
          costPrice: data.costPrice,
          weight: data.weight,
          barcode: data.barcode,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
        
        return product;
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load products', 'Error');
        console.error('Error loading products:', error);
        return of([]);
      })
    );
  }

  getProduct(id: string): Observable<Product | undefined> {
    return this.productsCollection.doc(id).valueChanges().pipe(
      map(product => {
        if (!product) return undefined;
        
        const data = product as any;
        return {
          id,
          sku: data.sku,
          name: data.name,
          description: data.description,
          category: data.category,
          brand: data.brand,
          unit: data.unit,
          unitPrice: data.unitPrice,
          costPrice: data.costPrice,
          weight: data.weight,
          barcode: data.barcode,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }),
      catchError(error => {
        this.notificationService.showError('Failed to load product', 'Error');
        console.error('Error loading product:', error);
        return of(undefined);
      })
    );
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const docRef = await this.productsCollection.add({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Product created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create product', 'Error');
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      await this.productsCollection.doc(id).update({
        ...product,
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Product updated successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update product', 'Error');
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await this.productsCollection.doc(id).delete();
      this.notificationService.showSuccess('Product deleted successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to delete product', 'Error');
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Inventory CRUD Operations
  getInventoryItems(warehouseId?: string): Observable<InventoryItem[]> {
    let query = this.inventoryCollection;
    
    if (warehouseId) {
      query = this.firestore.collection<InventoryItem>('inventory', ref => 
        ref.where('warehouseId', '==', warehouseId)
      );
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        
        // Convert Firebase Timestamps to JavaScript Date objects
        const inventoryItem: InventoryItem = {
          id,
          productId: data.productId,
          product: data.product ? {
            ...data.product,
            createdAt: data.product.createdAt?.toDate ? data.product.createdAt.toDate() : data.product.createdAt,
            updatedAt: data.product.updatedAt?.toDate ? data.product.updatedAt.toDate() : data.product.updatedAt
          } : data.product,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          reservedQuantity: data.reservedQuantity,
          availableQuantity: data.availableQuantity,
          minStockLevel: data.minStockLevel,
          maxStockLevel: data.maxStockLevel,
          reorderPoint: data.reorderPoint,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
          location: data.location,
          batchNumber: data.batchNumber,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          notes: data.notes
        };
        
        return inventoryItem;
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load inventory', 'Error');
        console.error('Error loading inventory:', error);
        return of([]);
      })
    );
  }

  async updateInventoryQuantity(
    inventoryId: string, 
    newQuantity: number, 
    reason: string, 
    userId: string, 
    userName: string
  ): Promise<void> {
    try {
      const inventoryRef = this.inventoryCollection.doc(inventoryId);
      const inventoryDoc = await inventoryRef.get().toPromise();
      
      if (!inventoryDoc?.exists) {
        throw new Error('Inventory item not found');
      }

      const currentData = inventoryDoc.data() as InventoryItem;
      const previousQuantity = currentData.quantity;
      const movementType = newQuantity > previousQuantity ? 'in' : 'out';

      // Update inventory
      await inventoryRef.update({
        quantity: newQuantity,
        availableQuantity: newQuantity - currentData.reservedQuantity,
        lastUpdated: new Date()
      });

      // Create stock movement record
      await this.movementsCollection.add({
        productId: currentData.productId,
        product: currentData.product,
        warehouseId: currentData.warehouseId,
        movementType,
        quantity: Math.abs(newQuantity - previousQuantity),
        previousQuantity,
        newQuantity,
        reason,
        userId,
        userName,
        timestamp: new Date()
      });

      this.notificationService.showSuccess('Inventory updated successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update inventory', 'Error');
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  // Stock Movements
  getStockMovements(productId?: string, warehouseId?: string): Observable<StockMovement[]> {
    let query = this.movementsCollection;
    
    if (productId) {
      query = this.firestore.collection<StockMovement>('stock-movements', ref => 
        ref.where('productId', '==', productId).orderBy('timestamp', 'desc')
      );
    } else if (warehouseId) {
      query = this.firestore.collection<StockMovement>('stock-movements', ref => 
        ref.where('warehouseId', '==', warehouseId).orderBy('timestamp', 'desc')
      );
    } else {
      query = this.firestore.collection<StockMovement>('stock-movements', ref => 
        ref.orderBy('timestamp', 'desc')
      );
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as StockMovement;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load stock movements', 'Error');
        console.error('Error loading stock movements:', error);
        return of([]);
      })
    );
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return this.categoriesCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        
        // Convert Firebase Timestamps to JavaScript Date objects
        const category: Category = {
          id,
          name: data.name,
          description: data.description,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
        
        return category;
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load categories', 'Error');
        console.error('Error loading categories:', error);
        return of([]);
      })
    );
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<string> {
    try {
      const docRef = await this.categoriesCollection.add({
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Category created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create category', 'Error');
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    try {
      await this.categoriesCollection.doc(id).update({
        ...category,
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Category updated successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update category', 'Error');
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await this.categoriesCollection.doc(id).delete();
      this.notificationService.showSuccess('Category deleted successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to delete category', 'Error');
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Analytics
  getLowStockItems(warehouseId?: string): Observable<InventoryItem[]> {
    let query = this.inventoryCollection;
    
    if (warehouseId) {
      query = this.firestore.collection<InventoryItem>('inventory', ref => 
        ref.where('warehouseId', '==', warehouseId)
      );
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as InventoryItem;
        const id = a.payload.doc.id;
        return { id, ...data };
      }).filter(item => item.quantity <= item.reorderPoint)),
      catchError(error => {
        console.error('Error loading low stock items:', error);
        return of([]);
      })
    );
  }

  getInventoryStats(warehouseId?: string): Observable<any> {
    return this.getInventoryItems(warehouseId).pipe(
      map(items => {
        const totalItems = items.length;
        const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.product.unitPrice), 0);
        const lowStockItems = items.filter(item => item.quantity <= item.reorderPoint).length;
        const outOfStockItems = items.filter(item => item.quantity === 0).length;

        return {
          totalItems,
          totalValue,
          lowStockItems,
          outOfStockItems,
          averageValue: totalItems > 0 ? totalValue / totalItems : 0
        };
      })
    );
  }

  // Alias for getInventoryItems to match component usage
  getInventory(): Observable<InventoryItem[]> {
    console.log('Getting inventory from Firebase...');
    return this.getInventoryItems().pipe(
      map(items => {
        console.log('Inventory items from Firebase:', items);
        return items;
      })
    );
  }

  // Stock adjustment
  adjustStock(movement: Partial<StockMovement>): Observable<void> {
    const movementData: StockMovement = {
      id: this.firestore.createId(),
      productId: movement.productId || '',
      product: movement.product || {} as Product,
      warehouseId: movement.warehouseId || '',
      movementType: movement.movementType || 'adjustment',
      quantity: movement.quantity || 0,
      previousQuantity: movement.previousQuantity || 0,
      newQuantity: movement.newQuantity || 0,
      reason: movement.reason || '',
      notes: movement.notes || '',
      timestamp: new Date(),
      userId: movement.userId || '',
      userName: movement.userName || ''
    };

    return from(this.movementsCollection.add(movementData)).pipe(
      map(() => {
        this.notificationService.showSuccess('Stock adjusted successfully!');
      }),
      catchError(error => {
        this.notificationService.showError('Failed to adjust stock');
        console.error('Error adjusting stock:', error);
        throw error;
      })
    );
  }

  // Create sample data for testing
  async createSampleData(): Promise<void> {
    try {
      // First create a sample warehouse
      const warehouseService = this.firestore.collection('warehouses');
      const warehouseRef = await warehouseService.add({
        name: 'Main Warehouse',
        description: 'Primary warehouse facility',
        capacity: 10000,
        managerName: 'John Smith',
        managerId: 'manager001',
        address: '123 Warehouse St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        contactPhone: '+1-555-0123',
        contactEmail: 'warehouse@company.com',
        isActive: true,
        currentStock: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const warehouseId = warehouseRef.id;

      // First create some sample products
      const sampleProducts = [
        {
          sku: 'PROD001',
          name: 'Laptop Computer',
          description: 'High-performance laptop for business use',
          category: 'Electronics',
          brand: 'TechCorp',
          unit: 'pcs',
          unitPrice: 999.99,
          costPrice: 750.00,
          weight: 2.5,
          barcode: '1234567890123',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          sku: 'PROD002',
          name: 'Office Chair',
          description: 'Ergonomic office chair with lumbar support',
          category: 'Furniture',
          brand: 'ComfortSeat',
          unit: 'pcs',
          unitPrice: 299.99,
          costPrice: 200.00,
          weight: 15.0,
          barcode: '1234567890124',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          sku: 'PROD003',
          name: 'Notebook Set',
          description: 'Set of 5 spiral notebooks',
          category: 'Office Supplies',
          brand: 'WriteRight',
          unit: 'set',
          unitPrice: 24.99,
          costPrice: 15.00,
          weight: 1.2,
          barcode: '1234567890125',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Create products
      const productIds = [];
      for (const product of sampleProducts) {
        const docRef = await this.productsCollection.add(product);
        productIds.push(docRef.id);
        console.log('Created product:', product.name, 'with ID:', docRef.id);
      }

      // Create sample inventory items
      const sampleInventory = [
        {
          productId: productIds[0],
          product: { 
            ...sampleProducts[0], 
            id: productIds[0],
            imageUrl: 'assets/images/default-product.svg'
          },
          warehouseId: warehouseId,
          quantity: 25,
          reservedQuantity: 5,
          availableQuantity: 20,
          minStockLevel: 10,
          maxStockLevel: 100,
          reorderPoint: 15,
          lastUpdated: new Date(),
          location: 'A1-B2',
          batchNumber: 'BATCH001',
          supplierId: 'supplier1',
          supplierName: 'Tech Supplier Inc',
          notes: 'High demand item'
        },
        {
          productId: productIds[1],
          product: { 
            ...sampleProducts[1], 
            id: productIds[1],
            imageUrl: 'assets/images/default-product.svg'
          },
          warehouseId: warehouseId,
          quantity: 15,
          reservedQuantity: 2,
          availableQuantity: 13,
          minStockLevel: 5,
          maxStockLevel: 50,
          reorderPoint: 8,
          lastUpdated: new Date(),
          location: 'C3-D4',
          batchNumber: 'BATCH002',
          supplierId: 'supplier2',
          supplierName: 'Furniture Plus',
          notes: 'Popular office furniture'
        },
        {
          productId: productIds[2],
          product: { 
            ...sampleProducts[2], 
            id: productIds[2],
            imageUrl: 'assets/images/default-product.svg'
          },
          warehouseId: warehouseId,
          quantity: 8,
          reservedQuantity: 0,
          availableQuantity: 8,
          minStockLevel: 20,
          maxStockLevel: 200,
          reorderPoint: 25,
          lastUpdated: new Date(),
          location: 'E5-F6',
          batchNumber: 'BATCH003',
          supplierId: 'supplier3',
          supplierName: 'Office Supplies Co',
          notes: 'Low stock - needs reorder'
        }
      ];

      // Create inventory items
      for (const item of sampleInventory) {
        const docRef = await this.inventoryCollection.add(item);
        console.log('Created inventory item:', item.product.name, 'with ID:', docRef.id);
      }

      // Create sample categories
      const sampleCategories = [
        {
          name: 'Electronics',
          description: 'Electronic devices and components',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Furniture',
          description: 'Office and home furniture',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Office Supplies',
          description: 'Office equipment and supplies',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Clothing',
          description: 'Apparel and accessories',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Books',
          description: 'Books and educational materials',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Create categories
      for (const category of sampleCategories) {
        const docRef = await this.categoriesCollection.add(category);
        console.log('Created category:', category.name, 'with ID:', docRef.id);
      }

      this.notificationService.showSuccess('Sample data created successfully!', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to create sample data', 'Error');
      console.error('Error creating sample data:', error);
      throw error;
    }
  }

  // Export inventory
  exportInventory(inventory: InventoryItem[]): Observable<void> {
    return new Observable(observer => {
      try {
        // Create CSV content
        const headers = ['Product Name', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Unit Price', 'Total Value', 'Status'];
        const csvContent = [
          headers.join(','),
          ...inventory.map(item => [
            `"${item.product.name}"`,
            item.product.sku,
            item.product.category,
            item.warehouseId,
            item.quantity,
            item.product.unitPrice,
            (item.quantity * item.product.unitPrice).toFixed(2),
            item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.reorderPoint ? 'Low Stock' : 'Available'
          ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }
}
