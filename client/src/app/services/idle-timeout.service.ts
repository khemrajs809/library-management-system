import { Injectable, inject, NgZone, signal } from '@angular/core';
import { AuthService } from './auth';
import { fromEvent, merge, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  private readonly INACTIVITY_THRESHOLD_SECONDS = 60; // 1 minute of silence before countdown starts
  private readonly GRACE_PERIOD_SECONDS = 9 * 60; // 10 minutes countdown

  public idleRemaining = signal<number>(this.GRACE_PERIOD_SECONDS);
  public isThresholdReached = signal<boolean>(false);

  private destroy$ = new Subject<void>();
  private countdownInterval: any;
  private lastActivityTime: number = Date.now();

  constructor() { }

  /**
   * Starts monitoring user activity. 
   */
  startMonitoring() {
    this.stopMonitoring();
    this.lastActivityTime = Date.now();
    this.isThresholdReached.set(false);
    this.idleRemaining.set(this.GRACE_PERIOD_SECONDS);

    const activityEvents$ = merge(
      fromEvent(window, 'mousemove'),
      fromEvent(window, 'mousedown'),
      fromEvent(window, 'keypress'),
      fromEvent(window, 'touchstart'),
      fromEvent(window, 'scroll')
    );

    this.ngZone.runOutsideAngular(() => {
      activityEvents$.pipe(
        throttleTime(1000),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.lastActivityTime = Date.now();
        if (this.isThresholdReached()) {
          this.ngZone.run(() => {
            this.isThresholdReached.set(false);
            this.idleRemaining.set(this.GRACE_PERIOD_SECONDS);
          });
        }
      });

      this.startTick();
    });
  }

  private startTick() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      if (!this.authService.isLoggedIn()) return;

      const secondsSinceLastActivity = Math.floor((Date.now() - this.lastActivityTime) / 1000);

      if (secondsSinceLastActivity >= this.INACTIVITY_THRESHOLD_SECONDS) {
          this.isThresholdReached.set(true);

        const remainingGrace = this.GRACE_PERIOD_SECONDS - (secondsSinceLastActivity - this.INACTIVITY_THRESHOLD_SECONDS);

        if (remainingGrace <= 0) {
          this.ngZone.run(() => {
            console.log('[IdleTimeout] Total inactivity period reached. Logging out...');
            this.authService.logout();
          });
          clearInterval(this.countdownInterval);
        } else {
          // Update the signal directly
          if (this.idleRemaining() !== remainingGrace) {
            this.idleRemaining.set(remainingGrace);
          }
        }
      } else {
          this.isThresholdReached.set(false);
      }
    }, 1000);
  }

  stopMonitoring() {
    this.destroy$.next();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}
