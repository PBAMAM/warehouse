import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingService } from '../../../core/services/loading.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  template: `
    <div class="register-container" [@fadeIn]>
      <div class="register-card" [@slideUp]>
        <div class="register-header">
          <div class="logo">
            <i class="fas fa-warehouse"></i>
            <h1>Create Account</h1>
          </div>
          <p class="subtitle">Join our warehouse management system</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-row">
            <div class="form-group" [@fadeInUp]>
              <label for="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                formControlName="firstName"
                placeholder="Enter first name"
                [class.error]="isFieldInvalid('firstName')"
              />
              <div *ngIf="isFieldInvalid('firstName')" class="error-message">
                First name is required
              </div>
            </div>

            <div class="form-group" [@fadeInUp]>
              <label for="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                placeholder="Enter last name"
                [class.error]="isFieldInvalid('lastName')"
              />
              <div *ngIf="isFieldInvalid('lastName')" class="error-message">
                Last name is required
              </div>
            </div>
          </div>

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
              <span *ngIf="registerForm.get('email')?.errors?.['required']">Email is required</span>
              <span *ngIf="registerForm.get('email')?.errors?.['email']">Please enter a valid email</span>
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
                placeholder="Create a password"
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
              <span *ngIf="registerForm.get('password')?.errors?.['required']">Password is required</span>
              <span *ngIf="registerForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <div class="form-group" [@fadeInUp]>
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-container">
              <i class="fas fa-lock input-icon"></i>
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Confirm your password"
                [class.error]="isFieldInvalid('confirmPassword')"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="toggleConfirmPassword()"
              >
                <i [class]="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <div *ngIf="isFieldInvalid('confirmPassword')" class="error-message">
              <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">Please confirm your password</span>
              <span *ngIf="registerForm.get('confirmPassword')?.errors?.['passwordMismatch']">Passwords do not match</span>
            </div>
          </div>

          <div class="form-group" [@fadeInUp]>
            <label for="department">Department</label>
            <select
              id="department"
              formControlName="department"
              [class.error]="isFieldInvalid('department')"
            >
              <option value="">Select Department</option>
              <option value="warehouse">Warehouse</option>
              <option value="inventory">Inventory</option>
              <option value="shipping">Shipping</option>
              <option value="receiving">Receiving</option>
              <option value="admin">Administration</option>
            </select>
            <div *ngIf="isFieldInvalid('department')" class="error-message">
              Department is required
            </div>
          </div>

          <div class="form-group" [@fadeInUp]>
            <label class="terms-checkbox">
              <input type="checkbox" formControlName="acceptTerms">
              <span class="checkmark"></span>
              I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="terms-link">Privacy Policy</a>
            </label>
            <div *ngIf="isFieldInvalid('acceptTerms')" class="error-message">
              You must accept the terms and conditions
            </div>
          </div>

          <button
            type="submit"
            class="register-button"
            [disabled]="registerForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading">Create Account</span>
            <span *ngIf="isLoading" class="loading">
              <i class="fas fa-spinner fa-spin"></i>
              Creating Account...
            </span>
          </button>
        </form>

        <div class="register-footer" [@fadeInUp]>
          <p>Already have an account? <a routerLink="/login" class="login-link">Sign in here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 0;
    }

    .register-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 500px;
    }

    .register-header {
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

    .register-form {
      margin-bottom: 2rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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

    .input-container input,
    select {
      width: 100%;
      padding: 1rem 1rem 1rem 3rem;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    .input-container input:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-container input.error,
    select.error {
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

    .terms-checkbox {
      display: flex;
      align-items: flex-start;
      cursor: pointer;
      font-size: 0.9rem;
      color: #666;
      line-height: 1.4;
    }

    .terms-checkbox input {
      margin-right: 0.5rem;
      margin-top: 0.1rem;
    }

    .terms-link {
      color: #667eea;
      text-decoration: none;
    }

    .terms-link:hover {
      text-decoration: underline;
    }

    .register-button {
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

    .register-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .register-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .loading i {
      margin-right: 0.5rem;
    }

    .register-footer {
      text-align: center;
    }

    .register-footer p {
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

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .register-card {
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
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
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
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      department: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { firstName, lastName, email, password, department } = this.registerForm.value;
      
      const userData: Partial<User> = {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        role: 'employee',
        department,
        isActive: true
      };

      this.loadingService.show();
      this.authService.signUp(email, password, userData)
        .then(() => {
          this.notificationService.showSuccess('Account created successfully!', 'Registration Successful');
          this.router.navigate(['/dashboard']);
        })
        .catch(error => {
          this.notificationService.showError(error.message, 'Registration Failed');
        })
        .finally(() => {
          this.loadingService.hide();
        });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
