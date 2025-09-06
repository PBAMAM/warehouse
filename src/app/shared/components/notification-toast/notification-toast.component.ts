import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-toast',
  template: `
    <div 
      class="notification-toast" 
      [@slideIn] 
      [class]="'notification-' + notification.type"
      (click)="onClick()"
    >
      <div class="notification-icon">
        <i [class]="getIconClass()"></i>
      </div>
      <div class="notification-content">
        <h4 class="notification-title">{{ notification.title }}</h4>
        <p class="notification-message">{{ notification.message }}</p>
      </div>
      <button class="notification-close" (click)="onClose($event)">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `,
  styles: [`
    .notification-toast {
      display: flex;
      align-items: center;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 300px;
      max-width: 500px;
    }

    .notification-toast:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .notification-success {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      color: white;
    }

    .notification-error {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }

    .notification-warning {
      background: linear-gradient(135deg, #f39c12, #e67e22);
      color: white;
    }

    .notification-info {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
    }

    .notification-icon {
      margin-right: 1rem;
      font-size: 1.5rem;
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .notification-message {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .notification-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0.25rem;
      margin-left: 1rem;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .notification-close:hover {
      opacity: 1;
    }
  `],
  animations: [
    trigger('slideIn', [
      state('in', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('void => *', [
        style({
          transform: 'translateX(100%)',
          opacity: 0
        }),
        animate('0.3s ease-out')
      ]),
      transition('* => void', [
        animate('0.3s ease-in', style({
          transform: 'translateX(100%)',
          opacity: 0
        }))
      ])
    ])
  ]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  @Input() notification!: Notification;
  @Output() close = new EventEmitter<string>();
  @Output() click = new EventEmitter<Notification>();

  private autoCloseTimer?: number;

  ngOnInit() {
    // Auto close after 5 seconds
    this.autoCloseTimer = window.setTimeout(() => {
      this.onClose();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  onClick() {
    this.click.emit(this.notification);
  }

  onClose(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.close.emit(this.notification.id);
  }

  getIconClass(): string {
    switch (this.notification.type) {
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
}
