import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { InventoryService } from '../../core/services/inventory.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  user$: Observable<User | null>;
  warehouses$: Observable<any[]>;
  inventoryStats$: Observable<any>;
  orderStats$: Observable<any>;
  lowStockItems$: Observable<any[]>;
  recentOrders$: Observable<any[]>;
  
  // Notification properties
  notifications: Notification[] = [];
  showNotifications = false;
  unreadCount = 0;

  constructor(
    private notificationService: NotificationService,
    private warehouseService: WarehouseService,
    private inventoryService: InventoryService,
    private orderService: OrderService,
    private authService: AuthService
  ) {
    this.user$ = this.authService.getCurrentUser();
    this.warehouses$ = this.warehouseService.getWarehouses();
    this.inventoryStats$ = this.inventoryService.getInventoryStats();
    this.orderStats$ = this.orderService.getOrderStats();
    this.lowStockItems$ = this.inventoryService.getLowStockItems();
    this.recentOrders$ = this.orderService.getOrders().pipe(
      map(orders => orders.slice(0, 5))
    );
  }

  ngOnInit() {
    this.setupNotificationListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private setupNotificationListeners() {
    // Listen for new notifications from the notification service
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: any[]) => {
        this.notifications = notifications;
        this.updateUnreadCount();
      });
  }

  private updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(notification: Notification) {
    this.notificationService.markAsRead(notification.id!);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  dismissNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    this.notificationService.removeNotification(notification.id!);
  }

  getNotificationIcon(type: string): string {
    const icons = {
      'info': 'fa-info-circle',
      'warning': 'fa-exclamation-triangle',
      'error': 'fa-times-circle',
      'success': 'fa-check-circle'
    };
    return icons[type as keyof typeof icons] || 'fa-bell';
  }


  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'warning',
      'processing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      'low': 'success',
      'normal': 'info',
      'high': 'warning',
      'urgent': 'danger'
    };
    return colors[priority] || 'secondary';
  }
}