import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: []
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  notifications: Notification[] = [];
  private notificationsSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
    
    // Subscribe to notifications for snackbar display
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        // Only show error notifications on login page
        this.notifications = notifications.filter(n => n.type === 'error');
      }
    );
  }

  ngOnDestroy() {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  initForm() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      this.loadingService.show();
      this.authService.signIn(email, password)
        .then(() => {
          this.notificationService.showSuccess('Welcome back!', 'Login Successful');
          this.router.navigate(['/dashboard']);
        })
        .catch(error => {
          // Show specific error messages for common authentication errors
          let errorMessage = 'An error occurred during login. Please try again.';
          
          if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
          } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.notificationService.showError(errorMessage, 'Login Failed');
        })
        .finally(() => {
          this.loadingService.hide();
        });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onNotificationClose(notificationId: string) {
    this.notificationService.removeNotification(notificationId);
  }

  onNotificationClick(notification: Notification) {
    // Handle notification click if needed
    console.log('Notification clicked:', notification);
  }
}
