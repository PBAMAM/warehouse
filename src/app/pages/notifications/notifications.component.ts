import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, Notification } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="notifications-page">
      <div class="page-header">
        <h1>
          <i class="fas fa-bell"></i>
          Notifications
        </h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="markAllAsRead()" *ngIf="(unreadCount$ | async) && (unreadCount$ | async)! > 0">
            <i class="fas fa-check-double"></i>
            Mark All as Read
          </button>
          <button class="btn btn-outline" (click)="clearAllNotifications()" *ngIf="(notifications$ | async)?.length && (notifications$ | async)!.length > 0">
            <i class="fas fa-trash"></i>
            Clear All
          </button>
        </div>
      </div>

      <div class="notifications-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-bell"></i>
          </div>
          <div class="stat-content">
            <h3>{{ (notifications$ | async)?.length || 0 }}</h3>
            <p>Total Notifications</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon unread">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="stat-content">
            <h3>{{ unreadCount$ | async }}</h3>
            <p>Unread</p>
          </div>
        </div>
      </div>

      <div class="notifications-list" *ngIf="(notifications$ | async)?.length && (notifications$ | async)!.length > 0; else noNotifications">
        <div 
          class="notification-card" 
          *ngFor="let notification of (notifications$ | async)"
          [class.unread]="!notification.read"
          (click)="onNotificationClick(notification)">
          
          <div class="notification-icon">
            <i [class]="getNotificationIcon(notification.type)"></i>
          </div>
          
          <div class="notification-content">
            <div class="notification-header">
              <h3 class="notification-title">{{ notification.title }}</h3>
              <div class="notification-time">{{ getTimeAgo(notification.timestamp) }}</div>
            </div>
            <p class="notification-message">{{ notification.message }}</p>
            <div class="notification-meta">
              <span class="notification-type">{{ notification.type | titlecase }}</span>
              <span class="notification-status" [class.unread]="!notification.read">
                {{ notification.read ? 'Read' : 'Unread' }}
              </span>
            </div>
          </div>
          
          <div class="notification-actions">
            <button 
              class="btn btn-sm btn-outline" 
              (click)="markAsRead(notification.id || '', $event)"
              *ngIf="!notification.read"
              title="Mark as read">
              <i class="fas fa-check"></i>
            </button>
            <button 
              class="btn btn-sm btn-danger" 
              (click)="removeNotification(notification.id || '', $event)"
              title="Remove">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <ng-template #noNotifications>
        <div class="no-notifications">
          <i class="fas fa-bell-slash"></i>
          <h3>No notifications yet</h3>
          <p>You'll see notifications here when they arrive.</p>
        </div>
      </ng-template>
    </div>
  `,
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  currentUser: User | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit() {
    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          // Load user-specific notifications from Firebase
          this.loadUserNotifications(user.uid);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserNotifications(userId: string) {
    this.notificationService.getUserNotifications(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        // Update the local notifications
        notifications.forEach(notification => {
          this.notificationService.addNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority || 'low',
            category: notification.category || 'general',
            suppressible: notification.suppressible !== undefined ? notification.suppressible : true,
            userId: notification.userId || undefined,
            actionUrl: notification.actionUrl
          });
        });
      });
  }

  onNotificationClick(notification: Notification) {
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
    
    if (!notification.read && notification.id) {
      this.markAsRead(notification.id);
    }
  }

  markAsRead(notificationId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  removeNotification(notificationId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.removeNotification(notificationId);
  }

  clearAllNotifications() {
    this.notificationService.clearAllNotifications();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-bell';
    }
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
}
