import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
    { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
    { path: 'forgot-password', loadComponent: () => import('./features/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
    { path: 'learn-more', loadComponent: () => import('./features/notes/notes.component').then(m => m.NotesComponent) },
    { path: 'admin/staff', loadComponent: () => import('./features/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard] },
    { path: 'admin/dashboard', loadComponent: () => import('./features/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard] },
    { path: 'librarian/dashboard', loadComponent: () => import('./features/librarian-dashboard/librarian-dashboard.component').then(m => m.LibrarianDashboardComponent), canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
