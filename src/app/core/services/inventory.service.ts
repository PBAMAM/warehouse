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
        const data = a.payload.doc.data() as Product;
        const id = a.payload.doc.id;
        return { id, ...data };
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
      map(product => product ? { id, ...product } : undefined),
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
        const data = a.payload.doc.data() as InventoryItem;
        const id = a.payload.doc.id;
        return { id, ...data };
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
        const data = a.payload.doc.data() as Category;
        const id = a.payload.doc.id;
        return { id, ...data };
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
    return this.getInventoryItems();
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
