import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (authService.isLoggedIn()) {
    const role = authService.userRole();
    const url = state.url;

    // Detect Direct Navigation (Copy-Paste / Manual URL Entry)
    // We allow navigation only if it's marked as internal (from login or in-app navigation)
    if (!authService.isInternalNavigation()) {
      console.warn('Security Warning: Direct navigation detected. Logging out.');
      toast.error('Security Alert: Manual URL manipulation detected. Session terminated.');
      authService.logout();
      return false;
    }

    // Role-based Access Control
    if (url.startsWith('/admin') && role !== 'admin') {
      console.error('Security Violation: Unauthorized admin access attempt.');
      toast.error('Security Alert: Unauthorized access attempt. Session terminated.');
      authService.logout();
      return false;
    }

    if (url.startsWith('/librarian') && role !== 'librarian') {
      // Allow admins to view librarian dashboard if needed, or redirect back
      if (role === 'admin') {
        return true; 
      }
      console.error('Security Violation: Unauthorized librarian access attempt.');
      toast.error('Security Alert: Unauthorized access attempt. Session terminated.');
      authService.logout();
      return false;
    }

    return true;
  } else {
    router.navigate(['/login.component']);
    return false;
  }
};
