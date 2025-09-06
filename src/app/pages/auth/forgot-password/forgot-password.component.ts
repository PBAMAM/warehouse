import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-forgot-password',
  template: `
    <div class="forgot-password-container" [@fadeIn]>
      <div class="forgot-password-card" [@slideUp]>
        <div class="forgot-password-header">
          <div class="logo">
            <i class="fas fa-key"></i>
            <h1>Reset Password</h1>
          </div>
          <p class="subtitle">Enter your email to receive reset instructions</p>
        </div>

        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="forgot-password-form" *ngIf="!emailSent">
          <div class="form-group" [@fadeInUp]>
            <label for="email">Email Address</label>
            <div class="input-container">
              <i class="fas fa-envelope input-icon"></i>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="Enter your email address"
                [class.error]="isFieldInvalid('email')"
              />
            </div>
            <div *ngIf="isFieldInvalid('email')" class="error-message">
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['required']">Email is required</span>
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['email']">Please enter a valid email</span>
            </div>
          </div>

          <button
            type="submit"
            class="reset-button"
            [disabled]="forgotPasswordForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">Send Reset Instructions</span>
            <span *ngIf="isLoading" class="loading">
              <i class="fas fa-spinner fa-spin"></i>
              Sending...
            </span>
          </button>
        </form>

        <div class="success-message" *ngIf="emailSent" [@fadeInUp]>
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>Check Your Email</h3>
          <p>We've sent password reset instructions to <strong>{{ forgotPasswordForm.get('email')?.value }}</strong></p>
          <p class="note">If you don't see the email, check your spam folder.</p>
          <button class="back-to-login" (click)="goToLogin()">
            Back to Login
          </button>
        </div>

        <div class="forgot-password-footer" [@fadeInUp]>
          <p>Remember your password? <a routerLink="/login" class="login-link">Sign in here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 0;
    }

    .forgot-password-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .forgot-password-header {
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

    .forgot-password-form {
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
      text-align: left;
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

    .error-message {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      text-align: left;
    }

    .reset-button {
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
    }

    .reset-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .reset-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .loading i {
      margin-right: 0.5rem;
    }

    .success-message {
      margin-bottom: 2rem;
    }

    .success-icon {
      margin-bottom: 1rem;
    }

    .success-icon i {
      font-size: 4rem;
      color: #2ecc71;
    }

    .success-message h3 {
      color: #333;
      margin-bottom: 1rem;
    }

    .success-message p {
      color: #666;
      margin-bottom: 0.5rem;
    }

    .note {
      font-size: 0.9rem;
      color: #999;
    }

    .back-to-login {
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .back-to-login:hover {
      background: #5a6fd8;
      transform: translateY(-2px);
    }

    .forgot-password-footer {
      text-align: center;
    }

    .forgot-password-footer p {
      color: #666;
      margin: 0;
    }

    .login-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .login-link:hover {
      color: #5a6fd8;
    }

    @media (max-width: 480px) {
      .forgot-password-card {
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
    ])
  ]
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  emailSent = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  initForm() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.value;
      
      this.loadingService.show();
      this.authService.resetPassword(email)
        .then(() => {
          this.emailSent = true;
          this.notificationService.showSuccess('Reset instructions sent to your email', 'Email Sent');
        })
        .catch(error => {
          this.notificationService.showError(error.message, 'Reset Failed');
        })
        .finally(() => {
          this.loadingService.hide();
        });
    }
  }

  goToLogin() {
    // This would typically navigate to login, but since we're in the auth module,
    // we'll just reset the form
    this.emailSent = false;
    this.forgotPasswordForm.reset();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
