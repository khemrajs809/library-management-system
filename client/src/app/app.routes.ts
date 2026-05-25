import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./components/home/home').then(m => m.HomeComponent) },
    { path: 'login', loadComponent: () => import('./components/login/login').then(m => m.LoginComponent) },
    { path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
    { path: 'learn-more', loadComponent: () => import('./components/notes/notes').then(m => m.NotesComponent) },
    { path: 'admin/staff', loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent), canActivate: [authGuard] },
    { path: 'admin/dashboard', loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent), canActivate: [authGuard] },
    { path: 'librarian/dashboard', loadComponent: () => import('./components/librarian-dashboard/librarian-dashboard').then(m => m.LibrarianDashboardComponent), canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
