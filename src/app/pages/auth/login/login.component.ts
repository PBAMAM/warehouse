import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: []
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;

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
          // Test notification system
          setTimeout(() => {
            this.notificationService.testNotification();
          }, 2000);
          this.router.navigate(['/dashboard']);
        })
        .catch(error => {
          this.notificationService.showError(error.message, 'Login Failed');
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
}
