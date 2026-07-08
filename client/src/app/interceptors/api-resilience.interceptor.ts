import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, of } from 'rxjs';
import { ToastService } from '../services/toast.service';

/**
 * Resilient API Interceptor
 * Intercepts HTTP errors (500 Internal Server Errors, network drops, timeouts)
 * and ensures clean error logging + notification without crashing frontend DOM state.
 */
export const apiResilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Suppress SSR fetch/CSRF errors during Server-Side Rendering
      if (typeof document === 'undefined') {
        return of(null as any);
      }

      let userMessage = 'An unexpected network error occurred. Please check your connection.';

      if (error.status === 500) {
        userMessage = error.error?.message || 'Server encountered an internal error. Please try again.';
        console.error(`[API Resilience Interceptor] HTTP 500 on ${req.url}:`, error.error || error.message);
      } else if (error.status === 0) {
        userMessage = 'Unable to connect to Library Server. Offline or network issue.';
        console.warn(`[API Resilience Interceptor] Connection Timeout/Drop on ${req.url}`);
      } else if (error.error && typeof error.error === 'object' && error.error.message) {
        userMessage = error.error.message;
      }

      // Display user-friendly notification only in browser for 500 or network drops
      if (error.status >= 500 || error.status === 0) {
        toast.error(userMessage);
      }

      return throwError(() => error);
    })
  );
};
