import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-notification-bell',
  template: `
    <div class="notification-bell-container">
      <!-- Notification Bell Button -->
      <button 
        class="notification-bell" 
        (click)="toggleDropdown()"
        [class.has-unread]="(unreadCount$ | async) && (unreadCount$ | async)! > 0"
        [title]="(unreadCount$ | async) && (unreadCount$ | async)! > 0 ? 'You have ' + (unreadCount$ | async) + ' unread notifications' : 'No new notifications'">
        <i class="fas fa-bell"></i>
        <span class="notification-badge" *ngIf="(unreadCount$ | async) && (unreadCount$ | async)! > 0">
          {{ unreadCount$ | async }}
        </span>
        <div class="pulse-ring" *ngIf="(unreadCount$ | async) && (unreadCount$ | async)! > 0"></div>
      </button>

      <!-- Notification Dropdown -->
      <div class="notification-dropdown" [class.show]="showDropdown" *ngIf="showDropdown">
        <div class="dropdown-header">
          <h3>Notifications</h3>
          <div class="header-actions">
            <button class="btn-mark-all" (click)="markAllAsRead()" *ngIf="(unreadCount$ | async) && (unreadCount$ | async)! > 0">
              <i class="fas fa-check-double"></i>
              Mark all as read
            </button>
            <button class="btn-clear-all" (click)="clearAllNotifications()" *ngIf="(notifications$ | async)?.length && (notifications$ | async)!.length > 0">
              <i class="fas fa-trash"></i>
              Clear all
            </button>
          </div>
        </div>

        <div class="notifications-list" *ngIf="(notifications$ | async)?.length && (notifications$ | async)!.length > 0; else noNotifications">
          <div 
            class="notification-item" 
            *ngFor="let notification of (notifications$ | async)"
            [class.unread]="!notification.read"
            (click)="onNotificationClick(notification)">
            
            <div class="notification-icon">
              <i [class]="getNotificationIcon(notification.type)"></i>
            </div>
            
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-time">{{ getTimeAgo(notification.timestamp) }}</div>
            </div>
            
            <div class="notification-actions">
              <button 
                class="btn-mark-read" 
                (click)="markAsRead(notification.id || '', $event)"
                *ngIf="!notification.read"
                title="Mark as read">
                <i class="fas fa-check"></i>
              </button>
              <button 
                class="btn-remove" 
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
            <p>No notifications yet</p>
          </div>
        </ng-template>

        <div class="dropdown-footer" *ngIf="(notifications$ | async)?.length && (notifications$ | async)!.length > 0">
          <button class="btn-view-all" (click)="viewAllNotifications()">
            View all notifications
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  showDropdown = false;
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  currentUser: User | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      this.showDropdown = false;
    }
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
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
      this.router.navigate([notification.actionUrl]);
    }
    
    if (!notification.read && notification.id) {
      this.markAsRead(notification.id);
    }
    
    this.showDropdown = false;
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

  viewAllNotifications() {
    this.router.navigate(['/notifications']);
    this.showDropdown = false;
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
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }
}
