import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const role = authService.userRole();
    const url = state.url;

    if (url.startsWith('/admin') && role !== 'admin') {
      router.navigate([role === 'librarian' ? '/librarian/dashboard' : '/login']);
      return false;
    }

    if (url.startsWith('/librarian') && role !== 'librarian') {
      // Allow admins to view librarian dashboard if needed, or redirect back
      if (role === 'admin') {
        return true; // Let admins see librarian pages (they are supervisors)
      }
      router.navigate(['/login']);
      return false;
    }

    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
