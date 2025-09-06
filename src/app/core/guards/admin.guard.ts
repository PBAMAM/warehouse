import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAdmin().pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          return true;
        } else {
          return this.router.createUrlTree(['/dashboard']);
        }
      })
    );
  }
}
