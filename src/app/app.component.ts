import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { LoadingService } from './core/services/loading.service';
import { NotificationService, Notification } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'warehouse-project';
  isLoading$: Observable<boolean>;
  notifications$: Observable<Notification[]>;

  constructor(
    private loadingService: LoadingService,
    private notificationService: NotificationService
  ) {
    this.isLoading$ = this.loadingService.loading$;
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit() {
    console.log('App component initialized');
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
