import { Component, signal, inject, OnInit, OnDestroy, NgZone, DestroyRef } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';

import { ToastService } from './services/toast.service';
import { ModalService } from './services/modal.service';
import { AuthService } from './services/auth';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RouteLoaderComponent } from './components/animations/route-loader/route-loader';
import { IdleTimeoutService } from './services/idle-timeout.service';
import { TopAnnouncementBarComponent } from './components/shared/top-announcement-bar/top-announcement-bar';
import { AnnouncementService } from './services/announcement.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule, RouteLoaderComponent, TopAnnouncementBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  modalService = inject(ModalService);
  public authService = inject(AuthService);
  public announcementService = inject(AnnouncementService);
  private router = inject(Router);
  public idleTimeoutService = inject(IdleTimeoutService);
  private destroyRef = inject(DestroyRef);
  protected readonly title = signal('client');
  isRouteLoading = signal<boolean>(false);
  private loaderTimer: any = null;

  ngOnInit() {
    // Listen to router events to show/hide the global full-screen loader
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
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
    if (typeof localStorage !== 'undefined') {
      legacyKeys.forEach(key => localStorage.removeItem(key));
    }

    this.idleTimeoutService.startMonitoring();
  }

  ngOnDestroy() {
    this.idleTimeoutService.stopMonitoring();
  }
}
