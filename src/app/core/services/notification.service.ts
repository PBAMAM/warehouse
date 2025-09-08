import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map, take, switchMap } from 'rxjs/operators';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  userId?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  suppressible?: boolean; // Can be suppressed by user settings
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private notificationThrottle = new Map<string, number>(); // Track last notification time by type
  private userSettings = {
    showSuccessNotifications: true,  // Show success notifications for login
    showInfoNotifications: false,    // Don't show info notifications by default
    showWarningNotifications: true,  // Show warnings
    showErrorNotifications: true,    // Show errors
    showStockAdjustmentNotifications: false, // Don't show stock adjustment notifications by default
    throttleDuration: 3000,          // 3 seconds throttle for same type (reduced for better UX)
    maxNotificationsPerMinute: 10    // Limit notifications per minute
  };
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private afMessaging: AngularFireMessaging,
    private firestore: AngularFirestore
  ) {
    this.requestPermission();
    this.listenToNotifications();
  }

  // Check if notification should be shown based on settings and throttling
  private shouldShowNotification(type: string, category?: string): boolean {
    // Always block stock adjustment notifications regardless of settings
    if (category === 'stock' || category === 'inventory') {
      return false;
    }

    // Check user settings
    switch (type) {
      case 'success':
        if (!this.userSettings.showSuccessNotifications) return false;
        break;
      case 'info':
        if (!this.userSettings.showInfoNotifications) return false;
        break;
      case 'warning':
        if (!this.userSettings.showWarningNotifications) return false;
        break;
      case 'error':
        if (!this.userSettings.showErrorNotifications) return false;
        break;
    }

    // Check throttling
    const throttleKey = `${type}-${category || 'default'}`;
    const now = Date.now();
    const lastNotification = this.notificationThrottle.get(throttleKey);
    
    // Use longer throttle duration for stock adjustments
    const throttleDuration = category === 'stock' ? 
      Math.max(this.userSettings.throttleDuration * 3, 15000) : // At least 15 seconds for stock
      this.userSettings.throttleDuration;
    
    if (lastNotification && (now - lastNotification) < throttleDuration) {
      return false;
    }

    // Update throttle time
    this.notificationThrottle.set(throttleKey, now);
    return true;
  }

  // Update user notification settings
  updateSettings(settings: Partial<typeof this.userSettings>): void {
    this.userSettings = { ...this.userSettings, ...settings };
  }

  // Get current settings
  getSettings() {
    return { ...this.userSettings };
  }

  // Clear all stock adjustment notifications
  clearStockAdjustmentNotifications(): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(notification => 
      notification.category !== 'stock' && 
      !notification.title.includes('Stock Adjustment') &&
      !notification.title.includes('Stock adjustment') &&
      !notification.message.includes('stock') &&
      !notification.message.includes('Stock')
    );
    this.notificationsSubject.next(filteredNotifications);
    this.updateUnreadCount();
    console.log('Cleared stock adjustment notifications. Remaining:', filteredNotifications.length);
  }

  // Request notification permission
  private async requestPermission(): Promise<void> {
    try {
      // Check if service worker is supported
      if ('serviceWorker' in navigator) {
        try {
          // Register the service worker
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);
        } catch (swError) {
          console.warn('Service Worker registration failed:', swError);
          // Continue without service worker for now
        }
      }
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const token = await this.afMessaging.requestToken.toPromise();
          console.log('FCM Token:', token);
        } catch (tokenError) {
          console.warn('FCM Token request failed:', tokenError);
        }
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Unable to get permission to notify.', error);
    }
  }

  // Listen to Firebase Cloud Messaging
  private listenToNotifications(): void {
    this.afMessaging.messages.subscribe(
      (payload) => {
        console.log('Message received:', payload);
        this.showNotification(payload);
      },
      (error) => {
        console.error('Error receiving messages:', error);
      }
    );
  }

  // Show browser notification
  private showNotification(payload: any): void {
    const notification = new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/assets/icons/icon-192x192.png'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // Add a new notification (with duplicate prevention)
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    // Block any stock-related notifications
    if (notification.category === 'stock' || 
        notification.title.toLowerCase().includes('stock') ||
        notification.message.toLowerCase().includes('stock')) {
      console.log('Stock notification blocked:', notification.title);
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    const currentNotifications = this.notificationsSubject.value;
    
    // Check for duplicates (same title and message within last 5 seconds)
    const isDuplicate = currentNotifications.some(n => 
      n.title === newNotification.title && 
      n.message === newNotification.message &&
      (new Date().getTime() - n.timestamp.getTime()) < 5000
    );

    if (isDuplicate) {
      console.log('Duplicate notification prevented:', newNotification.title);
      return;
    }

    this.notificationsSubject.next([newNotification, ...currentNotifications]);
    this.updateUnreadCount();

    // Save to Firestore if userId is provided
    if (notification.userId) {
      this.saveNotificationToFirestore(newNotification);
    }
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    
    // Update in Firebase
    this.updateNotificationInFirestore(notificationId, { read: true });
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    
    // Update all in Firebase
    this.updateAllNotificationsInFirestore({ read: true });
  }

  // Remove notification
  removeNotification(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.filter(
      notification => notification.id !== notificationId
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    
    // Remove from Firebase
    this.deleteNotificationFromFirestore(notificationId);
  }

  // Clear all notifications
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
    this.updateUnreadCount();
    
    // Clear from Firebase
    this.clearAllNotificationsFromFirestore();
  }

  // Get notifications for a specific user
  getUserNotifications(userId: string): Observable<Notification[]> {
    return this.firestore
      .collection('notifications', ref => ref.where('userId', '==', userId).orderBy('timestamp', 'desc'))
      .valueChanges()
      .pipe(
        map(notifications => notifications as Notification[])
      );
  }

  // Save notification to Firestore
  private async saveNotificationToFirestore(notification: Notification): Promise<void> {
    try {
      await this.firestore.collection('notifications').add(notification);
    } catch (error) {
      console.error('Error saving notification to Firestore:', error);
    }
  }

  // Update notification in Firestore
  private async updateNotificationInFirestore(notificationId: string, updates: Partial<Notification>): Promise<void> {
    try {
      const notificationRef = this.firestore.collection('notifications', ref => 
        ref.where('id', '==', notificationId)
      );
      const snapshot = await notificationRef.get().toPromise();
      
      if (snapshot && !snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update(updates);
      }
    } catch (error) {
      console.error('Error updating notification in Firestore:', error);
    }
  }

  // Update all notifications in Firestore
  private async updateAllNotificationsInFirestore(updates: Partial<Notification>): Promise<void> {
    try {
      const notifications = this.notificationsSubject.value;
      const batch = this.firestore.firestore.batch();
      
      for (const notification of notifications) {
        if (notification.id) {
          const notificationRef = this.firestore.collection('notifications', ref => 
            ref.where('id', '==', notification.id)
          );
          const snapshot = await notificationRef.get().toPromise();
          
          if (snapshot && !snapshot.empty) {
            const doc = snapshot.docs[0];
            batch.update(doc.ref, updates);
          }
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error updating all notifications in Firestore:', error);
    }
  }

  // Delete notification from Firestore
  private async deleteNotificationFromFirestore(notificationId: string): Promise<void> {
    try {
      const notificationRef = this.firestore.collection('notifications', ref => 
        ref.where('id', '==', notificationId)
      );
      const snapshot = await notificationRef.get().toPromise();
      
      if (snapshot && !snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.delete();
      }
    } catch (error) {
      console.error('Error deleting notification from Firestore:', error);
    }
  }

  // Clear all notifications from Firestore
  private async clearAllNotificationsFromFirestore(): Promise<void> {
    try {
      const notifications = this.notificationsSubject.value;
      const batch = this.firestore.firestore.batch();
      
      for (const notification of notifications) {
        if (notification.id) {
          const notificationRef = this.firestore.collection('notifications', ref => 
            ref.where('id', '==', notification.id)
          );
          const snapshot = await notificationRef.get().toPromise();
          
          if (snapshot && !snapshot.empty) {
            const doc = snapshot.docs[0];
            batch.delete(doc.ref);
          }
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error clearing all notifications from Firestore:', error);
    }
  }

  // Update unread count
  private updateUnreadCount(): void {
    const unreadCount = this.notificationsSubject.value.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Show success notification
  showSuccess(message: string, title: string = 'Success', category?: string): void {
    if (this.shouldShowNotification('success', category)) {
      this.addNotification({ 
        title, 
        message, 
        type: 'success', 
        priority: 'low',
        category: category || 'general',
        suppressible: true
      });
    }
  }

  // Show warning notification
  showWarning(message: string, title: string = 'Warning', category?: string): void {
    if (this.shouldShowNotification('warning', category)) {
      this.addNotification({ 
        title, 
        message, 
        type: 'warning', 
        priority: 'medium',
        category: category || 'general',
        suppressible: true
      });
    }
  }

  // Show info notification
  showInfo(message: string, title: string = 'Info', category?: string): void {
    if (this.shouldShowNotification('info', category)) {
      this.addNotification({ 
        title, 
        message, 
        type: 'info', 
        priority: 'low',
        category: category || 'general',
        suppressible: true
      });
    }
  }

  // Show error notification
  showError(message: string, title: string = 'Error', category?: string): void {
    if (this.shouldShowNotification('error', category)) {
      this.addNotification({ 
        title, 
        message, 
        type: 'error', 
        priority: 'high',
        category: category || 'general',
        suppressible: false
      });
    } else {
      // Log to console even if not shown
      console.error(`${title}: ${message}`);
    }
  }

  notifyOrderCreated(orderNumber: string, customerName: string, userId?: string): void {
    this.addNotification({
      title: 'New Order Created',
      message: `Order ${orderNumber} created by ${customerName}`,
      type: 'info',
      priority: 'medium',
      category: 'orders',
      suppressible: true,
      userId: userId,
      actionUrl: '/orders'
    });
  }

  notifyOrderUpdated(orderNumber: string, status: string, userId?: string): void {
    this.addNotification({
      title: 'Order Updated',
      message: `Order ${orderNumber} status changed to ${status}`,
      type: 'info',
      priority: 'low',
      category: 'orders',
      suppressible: true,
      userId: userId,
      actionUrl: '/orders'
    });
  }

  notifyInventoryUpdated(productName: string, action: string, userId?: string): void {
    this.addNotification({
      title: 'Inventory Updated',
      message: `${action} performed on ${productName}`,
      type: 'info',
      priority: 'low',
      category: 'inventory',
      suppressible: true,
      userId: userId,
      actionUrl: '/inventory'
    });
  }

  notifyStockAdjustment(productName: string, quantity: number, type: string, userId?: string): void {
    // Stock adjustment notifications are completely disabled to prevent spam
    console.log('Stock adjustment notification blocked:', { productName, quantity, type });
    return;
  }

  notifyWarehouseUpdated(warehouseName: string, action: string, userId?: string): void {
    this.addNotification({
      title: 'Warehouse Updated',
      message: `${action} performed on ${warehouseName}`,
      type: 'info',
      priority: 'low',
      category: 'warehouse',
      suppressible: true,
      userId: userId,
      actionUrl: '/warehouse'
    });
  }
}
