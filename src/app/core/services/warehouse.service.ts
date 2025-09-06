import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Warehouse, WarehouseZone, WarehouseRack } from '../models/warehouse.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private warehousesCollection: AngularFirestoreCollection<Warehouse>;
  private zonesCollection: AngularFirestoreCollection<WarehouseZone>;
  private racksCollection: AngularFirestoreCollection<WarehouseRack>;

  constructor(
    private firestore: AngularFirestore,
    private notificationService: NotificationService
  ) {
    this.warehousesCollection = this.firestore.collection<Warehouse>('warehouses');
    this.zonesCollection = this.firestore.collection<WarehouseZone>('warehouse-zones');
    this.racksCollection = this.firestore.collection<WarehouseRack>('warehouse-racks');
  }

  // Warehouse CRUD Operations
  getWarehouses(): Observable<Warehouse[]> {
    return this.warehousesCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Warehouse;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load warehouses', 'Error');
        console.error('Error loading warehouses:', error);
        return of([]);
      })
    );
  }

  getWarehouse(id: string): Observable<Warehouse | undefined> {
    return this.warehousesCollection.doc(id).valueChanges().pipe(
      map(warehouse => warehouse ? { id, ...warehouse } : undefined),
      catchError(error => {
        this.notificationService.showError('Failed to load warehouse', 'Error');
        console.error('Error loading warehouse:', error);
        return of(undefined);
      })
    );
  }

  async createWarehouse(warehouse: Omit<Warehouse, 'id'>): Promise<string> {
    try {
      const docRef = await this.warehousesCollection.add({
        ...warehouse,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Warehouse created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create warehouse', 'Error');
      console.error('Error creating warehouse:', error);
      throw error;
    }
  }

  async updateWarehouse(id: string, warehouse: Partial<Warehouse>): Promise<void> {
    try {
      await this.warehousesCollection.doc(id).update({
        ...warehouse,
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Warehouse updated successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update warehouse', 'Error');
      console.error('Error updating warehouse:', error);
      throw error;
    }
  }

  async deleteWarehouse(id: string): Promise<void> {
    try {
      await this.warehousesCollection.doc(id).delete();
      this.notificationService.showSuccess('Warehouse deleted successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to delete warehouse', 'Error');
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  }

  // Zone CRUD Operations
  getZones(warehouseId: string): Observable<WarehouseZone[]> {
    return this.firestore.collection<WarehouseZone>('warehouse-zones', ref => 
      ref.where('warehouseId', '==', warehouseId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as WarehouseZone;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load zones', 'Error');
        console.error('Error loading zones:', error);
        return of([]);
      })
    );
  }

  async createZone(zone: Omit<WarehouseZone, 'id'>): Promise<string> {
    try {
      const docRef = await this.zonesCollection.add({
        ...zone,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Zone created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create zone', 'Error');
      console.error('Error creating zone:', error);
      throw error;
    }
  }

  // Rack CRUD Operations
  getRacks(warehouseId: string, zoneId?: string): Observable<WarehouseRack[]> {
    let query = this.firestore.collection<WarehouseRack>('warehouse-racks', ref => 
      ref.where('warehouseId', '==', warehouseId)
    );
    
    if (zoneId) {
      query = this.firestore.collection<WarehouseRack>('warehouse-racks', ref => 
        ref.where('warehouseId', '==', warehouseId).where('zoneId', '==', zoneId)
      );
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as WarehouseRack;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load racks', 'Error');
        console.error('Error loading racks:', error);
        return of([]);
      })
    );
  }

  async createRack(rack: Omit<WarehouseRack, 'id'>): Promise<string> {
    try {
      const docRef = await this.racksCollection.add({
        ...rack,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Rack created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create rack', 'Error');
      console.error('Error creating rack:', error);
      throw error;
    }
  }

  // Analytics
  getWarehouseStats(warehouseId: string): Observable<any> {
    return this.firestore.collection('warehouses').doc(warehouseId).valueChanges().pipe(
      map((warehouse: any) => {
        if (!warehouse) return null;
        return {
          totalCapacity: warehouse.capacity || 0,
          currentStock: warehouse.currentStock || 0,
          utilizationRate: warehouse.capacity ? (warehouse.currentStock / warehouse.capacity) * 100 : 0,
          availableSpace: (warehouse.capacity || 0) - (warehouse.currentStock || 0)
        };
      }),
      catchError(error => {
        console.error('Error loading warehouse stats:', error);
        return of(null);
      })
    );
  }

  // Zone Management
  getWarehouseZones(warehouseId: string): Observable<WarehouseZone[]> {
    return this.firestore.collection<WarehouseZone>('warehouse-zones', ref => 
      ref.where('warehouseId', '==', warehouseId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as WarehouseZone;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load zones');
        console.error('Error loading zones:', error);
        return of([]);
      })
    );
  }


  updateZone(zoneId: string, zone: Partial<WarehouseZone>): Observable<void> {
    const updateData = {
      ...zone,
      updatedAt: new Date()
    };

    return from(this.firestore.collection('warehouse-zones').doc(zoneId).update(updateData)).pipe(
      map(() => {
        this.notificationService.showSuccess('Zone updated successfully!');
      }),
      catchError(error => {
        this.notificationService.showError('Failed to update zone');
        console.error('Error updating zone:', error);
        throw error;
      })
    );
  }

  deleteZone(zoneId: string): Observable<void> {
    return from(this.firestore.collection('warehouse-zones').doc(zoneId).delete()).pipe(
      map(() => {
        this.notificationService.showSuccess('Zone deleted successfully!');
      }),
      catchError(error => {
        this.notificationService.showError('Failed to delete zone');
        console.error('Error deleting zone:', error);
        throw error;
      })
    );
  }

  // Export warehouses
  exportWarehouses(warehouses: Warehouse[]): Observable<void> {
    return new Observable(observer => {
      try {
        // Create CSV content
        const headers = ['Name', 'Location', 'Manager', 'Capacity', 'Current Stock', 'Utilization %', 'Status', 'Created Date'];
        const csvContent = [
          headers.join(','),
          ...warehouses.map(warehouse => [
            `"${warehouse.name}"`,
            `"${warehouse.city}, ${warehouse.state}"`,
            `"${warehouse.managerName}"`,
            warehouse.capacity,
            warehouse.currentStock,
            warehouse.capacity > 0 ? ((warehouse.currentStock / warehouse.capacity) * 100).toFixed(2) : '0',
            warehouse.isActive ? 'Active' : 'Inactive',
            warehouse.createdAt.toISOString().split('T')[0]
          ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warehouses-export-${new Date().toISOString().split('T')[0]}.csv`;
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
