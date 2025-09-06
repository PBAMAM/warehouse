import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container" [@fadeIn]>
      <div class="login-card" [@slideUp]>
        <div class="login-header">
          <div class="logo">
            <i class="fas fa-warehouse"></i>
            <h1>Warehouse Manager</h1>
          </div>
          <p class="subtitle">Sign in to your account</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group" [@fadeInUp]>
            <label for="email">Email Address</label>
            <div class="input-container">
              <i class="fas fa-envelope input-icon"></i>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="Enter your email"
                [class.error]="isFieldInvalid('email')"
              />
            </div>
            <div *ngIf="isFieldInvalid('email')" class="error-message">
              <span *ngIf="loginForm.get('email')?.errors?.['required']">Email is required</span>
              <span *ngIf="loginForm.get('email')?.errors?.['email']">Please enter a valid email</span>
            </div>
          </div>

          <div class="form-group" [@fadeInUp]>
            <label for="password">Password</label>
            <div class="input-container">
              <i class="fas fa-lock input-icon"></i>
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                formControlName="password"
                placeholder="Enter your password"
                [class.error]="isFieldInvalid('password')"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="togglePassword()"
              >
                <i [class]="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <div *ngIf="isFieldInvalid('password')" class="error-message">
              <span *ngIf="loginForm.get('password')?.errors?.['required']">Password is required</span>
              <span *ngIf="loginForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <div class="form-options" [@fadeInUp]>
            <label class="remember-me">
              <input type="checkbox" formControlName="rememberMe">
              <span class="checkmark"></span>
              Remember me
            </label>
            <a routerLink="/forgot-password" class="forgot-password">Forgot Password?</a>
          </div>

          <button
            type="submit"
            class="login-button"
            [disabled]="loginForm.invalid || isLoading"
            [@pulse]="loginForm.valid && !isLoading"
          >
            <span *ngIf="!isLoading">Sign In</span>
            <span *ngIf="isLoading" class="loading">
              <i class="fas fa-spinner fa-spin"></i>
              Signing In...
            </span>
          </button>
        </form>

        <div class="login-footer" [@fadeInUp]>
          <p>Don't have an account? <a routerLink="/register" class="signup-link">Sign up here</a></p>
        </div>
      </div>

      <div class="background-animation">
        <div class="floating-shapes">
          <div class="shape shape-1" [@float]></div>
          <div class="shape shape-2" [@float]></div>
          <div class="shape shape-3" [@float]></div>
          <div class="shape shape-4" [@float]></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
      position: relative;
      z-index: 2;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .logo i {
      font-size: 2.5rem;
      color: #667eea;
      margin-right: 0.5rem;
    }

    .logo h1 {
      margin: 0;
      color: #333;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .subtitle {
      color: #666;
      margin: 0;
      font-size: 1rem;
    }

    .login-form {
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
      font-weight: 500;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      color: #999;
      z-index: 1;
    }

    .input-container input {
      width: 100%;
      padding: 1rem 1rem 1rem 3rem;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    .input-container input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-container input.error {
      border-color: #e74c3c;
    }

    .password-toggle {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.5rem;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .remember-me {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 0.9rem;
      color: #666;
    }

    .remember-me input {
      margin-right: 0.5rem;
    }

    .forgot-password {
      color: #667eea;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s ease;
    }

    .forgot-password:hover {
      color: #5a6fd8;
    }

    .login-button {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .login-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .login-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .loading i {
      margin-right: 0.5rem;
    }

    .login-footer {
      text-align: center;
    }

    .login-footer p {
      color: #666;
      margin: 0;
    }

    .signup-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .signup-link:hover {
      color: #5a6fd8;
    }

    .background-animation {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
    }

    .floating-shapes {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .shape {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
    }

    .shape-1 {
      width: 80px;
      height: 80px;
      top: 20%;
      left: 10%;
      animation: float 6s ease-in-out infinite;
      animation-delay: 0s;
    }

    .shape-2 {
      width: 120px;
      height: 120px;
      top: 60%;
      right: 10%;
      animation: float 6s ease-in-out infinite;
      animation-delay: 2s;
    }

    .shape-3 {
      width: 60px;
      height: 60px;
      top: 40%;
      left: 80%;
      animation: float 6s ease-in-out infinite;
      animation-delay: 4s;
    }

    .shape-4 {
      width: 100px;
      height: 100px;
      bottom: 20%;
      left: 20%;
      animation: float 6s ease-in-out infinite;
      animation-delay: 6s;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }

    @media (max-width: 480px) {
      .login-card {
        margin: 1rem;
        padding: 2rem;
      }
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(50px)', opacity: 0 }),
        animate('0.6s ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('0.4s ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('pulse', [
      state('true', style({ transform: 'scale(1)' })),
      transition('* => true', [
        animate('0.3s ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.05)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('float', [
      transition(':enter', [
        animate('6s ease-in-out', keyframes([
          style({ transform: 'translateY(0px) rotate(0deg)', offset: 0 }),
          style({ transform: 'translateY(-20px) rotate(180deg)', offset: 0.5 }),
          style({ transform: 'translateY(0px) rotate(360deg)', offset: 1 })
        ]))
      ])
    ])
  ]
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
