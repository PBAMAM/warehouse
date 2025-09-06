import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (user && user.uid) {
          // Add authorization header if user is authenticated
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${user.uid}`,
              'X-User-Id': user.uid
            }
          });
          return next.handle(authReq);
        }
        return next.handle(req);
      })
    );
  }
}
