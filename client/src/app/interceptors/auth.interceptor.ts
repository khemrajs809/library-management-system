import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { ToastService } from '../services/toast.service';
/**
 * Functional HTTP interceptor that automatically attaches the JWT token
 * from localStorage to every outgoing API request as a Bearer token.
 * This runs for ALL requests, so we only add the header when a token exists.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  // Clone the request and add withCredentials to send the HttpOnly cookie
  const authReq = req.clone({
    withCredentials: true
  });

  // Handle the response and catch 401 Unauthorized errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Session expired or invalid token
        toastService.error('Your session has expired. Please log in again.');
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
