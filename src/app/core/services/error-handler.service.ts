import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const notificationService = this.injector.get(NotificationService);
    
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';

    if (error instanceof HttpErrorResponse) {
      // HTTP Error
      switch (error.status) {
        case 400:
          errorMessage = 'Bad Request - Please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized - Please log in again';
          break;
        case 403:
          errorMessage = 'Forbidden - You do not have permission to perform this action';
          break;
        case 404:
          errorMessage = 'Not Found - The requested resource was not found';
          break;
        case 500:
          errorMessage = 'Internal Server Error - Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `HTTP Error ${error.status}`;
      }
    } else if (error.code) {
      // Firebase Error
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'permission-denied':
          errorMessage = 'Permission denied - You do not have access to this resource';
          break;
        case 'unavailable':
          errorMessage = 'Service temporarily unavailable. Please try again later';
          break;
        default:
          errorMessage = error.message || 'An error occurred';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Log error to console in development
    if (!environment.production) {
      console.error('Error:', error);
    }

    // Show notification
    notificationService.showError(errorMessage, errorTitle);
  }
}
