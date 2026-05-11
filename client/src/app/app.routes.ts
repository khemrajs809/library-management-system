import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { LoginComponent } from './components/login/login';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { LibrarianDashboardComponent } from './components/librarian-dashboard/librarian-dashboard';
import { NotesComponent } from './components/notes/notes';
import { authGuard } from './guards/auth-guard';


export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
    { path: 'learn-more', component: NotesComponent },
    { path: 'admin/staff', component: AdminDashboardComponent, canActivate: [authGuard] },
    { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
    { path: 'librarian/dashboard', component: LibrarianDashboardComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
