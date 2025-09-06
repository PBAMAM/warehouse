import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, delay } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated().pipe(
      delay(100), // Small delay to allow auth state to initialize
      take(1),
      map(isAuthenticated => {
        console.log('Auth guard check - isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
          return true;
        } else {
          console.log('User not authenticated, redirecting to login');
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
