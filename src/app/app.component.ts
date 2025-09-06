import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { LoadingService } from './core/services/loading.service';
import { NotificationService, Notification } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  title = 'warehouse-project';
  isLoading$: Observable<boolean>;
  notifications$: Observable<Notification[]>;
  showSidebar = false;
  currentRoute = '';

  constructor(
    private loadingService: LoadingService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.isLoading$ = this.loadingService.loading$;
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit() {
    this.setupRouteTracking();
    // Clear any existing test notifications
    this.notificationService.clearAllNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouteTracking() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateSidebarVisibility();
      });
  }

  private updateSidebarVisibility() {
    // Hide sidebar on auth pages (login, register, forgot-password)
    const authRoutes = ['/login', '/register', '/forgot-password', '/auth/login', '/auth/register', '/auth/forgot-password'];
    this.showSidebar = !authRoutes.some(route => this.currentRoute.startsWith(route));
  }

  onNotificationClose(notificationId: string) {
    this.notificationService.removeNotification(notificationId);
  }

  onNotificationClick(notification: Notification) {
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
    // Mark as read
    if (notification.id) {
      this.notificationService.markAsRead(notification.id);
    }
  }

}
