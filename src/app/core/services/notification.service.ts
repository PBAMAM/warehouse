import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { take, switchMap } from 'rxjs/operators';

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  userId?: string;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
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

  // Request notification permission
  private async requestPermission(): Promise<void> {
    try {
      await this.afMessaging.requestToken.toPromise();
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

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    const currentNotifications = this.notificationsSubject.value;
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
  }

  // Remove notification
  removeNotification(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.filter(
      notification => notification.id !== notificationId
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  // Clear all notifications
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
    this.updateUnreadCount();
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
  showSuccess(message: string, title: string = 'Success'): void {
    this.addNotification({ title, message, type: 'success' });
  }

  // Show error notification
  showError(message: string, title: string = 'Error'): void {
    this.addNotification({ title, message, type: 'error' });
  }

  // Show warning notification
  showWarning(message: string, title: string = 'Warning'): void {
    this.addNotification({ title, message, type: 'warning' });
  }

  // Show info notification
  showInfo(message: string, title: string = 'Info'): void {
    this.addNotification({ title, message, type: 'info' });
  }
}
