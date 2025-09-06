import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Order, OrderItem, OrderStatus, OrderPriority } from '../models/order.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersCollection: AngularFirestoreCollection<Order>;

  constructor(
    private firestore: AngularFirestore,
    private notificationService: NotificationService
  ) {
    this.ordersCollection = this.firestore.collection<Order>('orders');
  }

  // Order CRUD Operations
  getOrders(): Observable<Order[]> {
    return this.ordersCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load orders', 'Error');
        console.error('Error loading orders:', error);
        return of([]);
      })
    );
  }

  getOrder(id: string): Observable<Order | undefined> {
    return this.ordersCollection.doc(id).valueChanges().pipe(
      map(order => order ? { id, ...order } : undefined),
      catchError(error => {
        this.notificationService.showError('Failed to load order', 'Error');
        console.error('Error loading order:', error);
        return of(undefined);
      })
    );
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<string> {
    try {
      const orderNumber = await this.generateOrderNumber();
      const docRef = await this.ordersCollection.add({
        ...order,
        orderNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Order created successfully', 'Success');
      return docRef.id;
    } catch (error) {
      this.notificationService.showError('Failed to create order', 'Error');
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, order: Partial<Order>): Promise<void> {
    try {
      await this.ordersCollection.doc(id).update({
        ...order,
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Order updated successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update order', 'Error');
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'shipped') {
        updateData.shippedAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await this.ordersCollection.doc(id).update(updateData);
      this.notificationService.showSuccess(`Order status updated to ${status}`, 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to update order status', 'Error');
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      await this.ordersCollection.doc(id).delete();
      this.notificationService.showSuccess('Order deleted successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to delete order', 'Error');
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  // Order Filtering and Search
  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    return this.firestore.collection<Order>('orders', ref => 
      ref.where('status', '==', status).orderBy('createdAt', 'desc')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load orders by status', 'Error');
        console.error('Error loading orders by status:', error);
        return of([]);
      })
    );
  }

  getOrdersByPriority(priority: OrderPriority): Observable<Order[]> {
    return this.firestore.collection<Order>('orders', ref => 
      ref.where('priority', '==', priority).orderBy('createdAt', 'desc')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load orders by priority', 'Error');
        console.error('Error loading orders by priority:', error);
        return of([]);
      })
    );
  }

  searchOrders(query: string): Observable<Order[]> {
    return this.ordersCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return { id, ...data };
      }).filter(order => 
        order.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
        order.customerName.toLowerCase().includes(query.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(query.toLowerCase())
      )),
      catchError(error => {
        this.notificationService.showError('Failed to search orders', 'Error');
        console.error('Error searching orders:', error);
        return of([]);
      })
    );
  }

  // Order Analytics
  getOrderStats(): Observable<any> {
    return this.getOrders().pipe(
      map(orders => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const processingOrders = orders.filter(order => 
          ['confirmed', 'processing', 'picked', 'packed'].includes(order.status)
        ).length;
        const completedOrders = orders.filter(order => order.status === 'delivered').length;
        const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

        return {
          totalOrders,
          totalRevenue,
          pendingOrders,
          processingOrders,
          completedOrders,
          cancelledOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        };
      })
    );
  }

  getOrdersByDateRange(startDate: Date, endDate: Date): Observable<Order[]> {
    return this.firestore.collection<Order>('orders', ref => 
      ref.where('createdAt', '>=', startDate)
         .where('createdAt', '<=', endDate)
         .orderBy('createdAt', 'desc')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
      catchError(error => {
        this.notificationService.showError('Failed to load orders by date range', 'Error');
        console.error('Error loading orders by date range:', error);
        return of([]);
      })
    );
  }

  // Helper Methods
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Get count of orders today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayOrders = await this.getOrdersByDateRange(startOfDay, endOfDay).pipe(
      map(orders => orders.length)
    ).toPromise();
    
    const orderCount = (todayOrders || 0) + 1;
    const orderNumber = `ORD-${year}${month}${day}-${String(orderCount).padStart(4, '0')}`;
    
    return orderNumber;
  }

  // Order Processing
  async processOrder(id: string, assignedTo: string, assignedToName: string): Promise<void> {
    try {
      await this.ordersCollection.doc(id).update({
        status: 'processing',
        assignedTo,
        assignedToName,
        updatedAt: new Date()
      });
      this.notificationService.showSuccess('Order processing started', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to process order', 'Error');
      console.error('Error processing order:', error);
      throw error;
    }
  }

  async completeOrder(id: string, trackingNumber?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'shipped',
        shippedAt: new Date(),
        updatedAt: new Date()
      };

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      await this.ordersCollection.doc(id).update(updateData);
      this.notificationService.showSuccess('Order shipped successfully', 'Success');
    } catch (error) {
      this.notificationService.showError('Failed to complete order', 'Error');
      console.error('Error completing order:', error);
      throw error;
    }
  }


  // Export orders
  exportOrders(orders: Order[]): Observable<void> {
    return new Observable(observer => {
      try {
        // Create CSV content
        const headers = ['Order Number', 'Customer Name', 'Customer Email', 'Status', 'Priority', 'Total Amount', 'Created Date', 'Expected Delivery'];
        const csvContent = [
          headers.join(','),
          ...orders.map(order => [
            order.orderNumber,
            `"${order.customerName}"`,
            order.customerEmail,
            order.status,
            order.priority,
            order.totalAmount.toFixed(2),
            order.createdAt.toISOString().split('T')[0],
            order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString().split('T')[0] : ''
          ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
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
