import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { Product, InventoryItem, StockMovement, Category } from '../models/inventory.model';
import { NotificationService } from './notification.service';
import { WarehouseService } from './warehouse.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private inventoryCollection: AngularFirestoreCollection<InventoryItem>;
  private movementsCollection: AngularFirestoreCollection<StockMovement>;
  private categoriesCollection: AngularFirestoreCollection<Category>;

  constructor(
    private firestore: AngularFirestore,
    private notificationService: NotificationService,
    private warehouseService: WarehouseService
  ) {
    this.inventoryCollection = this.firestore.collection<InventoryItem>('inventory');
    this.movementsCollection = this.firestore.collection<StockMovement>('stock-movements');
    this.categoriesCollection = this.firestore.collection<Category>('categories');
  }

  // Inventory CRUD Operations
  async createInventoryItem(inventoryItem: Omit<InventoryItem, 'id'>): Promise<string> {
    try {
      const docRef = await this.inventoryCollection.add({
        ...inventoryItem,
        lastUpdated: new Date()
      });
      this.notificationService.showSuccess('Inventory item created successfully', 'Success');
      
      // Notify administrators about inventory update
      this.notificationService.notifyInventoryUpdated(
        inventoryItem.product?.name || 'Unknown Product',
        'Created',
        inventoryItem.warehouseId
      );
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, inventoryItem: Partial<InventoryItem>): Promise<void> {
    try {
      await this.inventoryCollection.doc(id).update({
        ...inventoryItem,
        lastUpdated: new Date()
      });
      this.notificationService.showSuccess('Inventory item updated successfully', 'Success');
      
      // Notify administrators about inventory update
      this.notificationService.notifyInventoryUpdated(
        inventoryItem.product?.name || 'Unknown Product',
        'Updated',
        inventoryItem.warehouseId
      );
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: string): Promise<void> {
    try {
      await this.inventoryCollection.doc(id).delete();
      this.notificationService.showSuccess('Inventory item deleted successfully', 'Success');
    } catch (error) {
      console.error('Error deleting inventory item:', error);
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
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : data.expiryDate,
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
    return this.inventoryCollection.snapshotChanges().pipe(
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
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : data.expiryDate,
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

  // Stock adjustment
  adjustStock(movement: Partial<StockMovement>): Observable<void> {
    return new Observable(observer => {
      // First, get the current inventory item
      this.inventoryCollection.ref
        .where('productId', '==', movement.productId)
        .where('warehouseId', '==', movement.warehouseId)
        .get()
        .then(snapshot => {
          if (snapshot.empty) {
            throw new Error('Inventory item not found');
          }

          const doc = snapshot.docs[0];
          const currentData = doc.data() as any;
          const currentQuantity = currentData.quantity || 0;
          const adjustmentQuantity = movement.quantity || 0;
          
          // Calculate new quantity based on movement type
          let newQuantity = currentQuantity;
          if (movement.movementType === 'in') {
            newQuantity = currentQuantity + adjustmentQuantity;
          } else if (movement.movementType === 'out') {
            newQuantity = Math.max(0, currentQuantity - adjustmentQuantity);
          } else if (movement.movementType === 'adjustment') {
            newQuantity = adjustmentQuantity;
          }

          // Create movement record
          const movementData: StockMovement = {
            id: this.firestore.createId(),
            productId: movement.productId || '',
            product: movement.product || currentData.product || {} as Product,
            warehouseId: movement.warehouseId || '',
            movementType: movement.movementType || 'adjustment',
            quantity: adjustmentQuantity,
            previousQuantity: currentQuantity,
            newQuantity: newQuantity,
            reason: movement.reason || '',
            notes: movement.notes || '',
            timestamp: new Date(),
            userId: movement.userId || '',
            userName: movement.userName || ''
          };

          // Update inventory item and create movement record
          const batch = this.firestore.firestore.batch();
          
          // Update inventory item
          batch.update(doc.ref, {
            quantity: newQuantity,
            availableQuantity: Math.max(0, newQuantity - (currentData.reservedQuantity || 0)),
            lastUpdated: new Date()
          });

          // Add movement record
          const movementRef = this.movementsCollection.ref.doc();
          batch.set(movementRef, movementData);

          // Commit the batch
          return batch.commit().then(() => {
            // DISABLED: No stock adjustment notifications to prevent spam
            // this.notificationService.notifyStockAdjustment(...);
          });
        })
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          console.error('Error adjusting stock:', error);
          observer.error(error);
        });
    });
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
