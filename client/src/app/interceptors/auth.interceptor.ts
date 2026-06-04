import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
/**
 * Functional HTTP interceptor that automatically attaches the JWT token
 * from localStorage to every outgoing API request as a Bearer token.
 * This runs for ALL requests, so we only add the header when a token exists.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  // Extract CSRF Token manually for cross-origin local development
  let xsrfToken = null;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;)\s*XSRF-TOKEN=([^;]*)/);
    if (match) xsrfToken = match[1];
  }

  // Clone the request and add withCredentials to send the HttpOnly cookie
  let authReq = req.clone({
    withCredentials: true
  });

  if (xsrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    authReq = authReq.clone({
      headers: req.headers.set('x-xsrf-token', xsrfToken)
    });
  }

  // Handle the response and catch 401 Unauthorized errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Suppress 403 Forbidden CSRF errors during Server-Side Rendering (SSR)
      if (error.status === 403 && typeof document === 'undefined') {
        return of(null as any);
      }

      if (error.status === 401 && typeof document !== 'undefined') {
        // Session expired or invalid token
        toastService.error('Your session has expired. Please log in again.');
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
