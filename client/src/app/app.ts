import { Component, signal, inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';

import { ToastService } from './services/toast.service';
import { ModalService } from './services/modal.service';
import { AuthService } from './services/auth';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RouteLoaderComponent } from './components/animations/route-loader/route-loader';
import { IdleTimeoutService } from './services/idle-timeout.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule, RouteLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  modalService = inject(ModalService);
  public authService = inject(AuthService);
  private router = inject(Router);
  public idleTimeoutService = inject(IdleTimeoutService);
  private routerSub!: Subscription;
  protected readonly title = signal('client');
  isRouteLoading = signal<boolean>(false);
  private loaderTimer: any = null;

  ngOnInit() {
    // Listen to router events to show/hide the global full-screen loader
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const fromLogin = this.router.url === '/login' || this.router.url === '/';
        if (fromLogin) return;

        this.loaderTimer = setTimeout(() => {
          this.isRouteLoading.set(true);
        }, 400);

      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        clearTimeout(this.loaderTimer);
        this.isRouteLoading.set(false);
      }
    });

    // Clear out legacy mock data
    const legacyKeys = [
      'library_books', 'library_records', 'library_students',
      'name', 'role', 'token', 'isLoggedIn', 'rememberMe'
    ];
    legacyKeys.forEach(key => localStorage.removeItem(key));

    this.idleTimeoutService.startMonitoring();
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
    this.idleTimeoutService.stopMonitoring();
  }
}
