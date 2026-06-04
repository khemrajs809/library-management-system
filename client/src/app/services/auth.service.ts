import { Injectable, inject, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../core/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private apiUrl = API_BASE;

  private getInitialSession() {
    try {
      const stored = localStorage.getItem('lib_session');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  }

  #sessionData = signal<{role: string, exp: number} | null>(this.getInitialSession());
  
  isLoggedIn = signal<boolean>(!!this.#sessionData());
  userRole = signal<string | null>(this.#sessionData()?.role || null);
  sessionRemaining = signal<string>('');
  private sessionTimerInterval: any;
  private internalNavKey = 'lib_internal_nav';

  constructor() {
    if (this.isLoggedIn()) {
      this.startSessionTimer();
    }
  }

  markInternalNavigation() {
    sessionStorage.setItem(this.internalNavKey, 'true');
  }

  isInternalNavigation(): boolean {
    return sessionStorage.getItem(this.internalNavKey) === 'true';
  }

  clearInternalNavigation() {
    sessionStorage.removeItem(this.internalNavKey);
  }



  private startSessionTimer() {
    if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
    
    this.ngZone.runOutsideAngular(() => {
      this.sessionTimerInterval = setInterval(() => {
        const session = this.#sessionData();
        if (!session) {
          clearInterval(this.sessionTimerInterval);
          return;
        }

        try {
          const exp = session.exp * 1000;
          const now = Date.now();
          const diff = exp - now;

          if (diff <= 0) {
            clearInterval(this.sessionTimerInterval);
            this.ngZone.run(() => this.logout());
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          // Update the signal directly; setInterval is already a macro-task
          const newValue = `${hours}h ${minutes}m ${seconds}s`;
          if (this.sessionRemaining() !== newValue) {
            this.sessionRemaining.set(newValue);
          }
        } catch (e) {
          clearInterval(this.sessionTimerInterval);
        }
      }, 1000);
    });
  }

  private handleLoginSuccess(res: any) {
    if (res.success) {
      const sessionObj = { role: res.role, exp: res.exp };
      localStorage.setItem('lib_session', JSON.stringify(sessionObj));
      this.#sessionData.set(sessionObj);
      this.isLoggedIn.set(true);
      this.userRole.set(res.role);
      this.markInternalNavigation();
      this.startSessionTimer();
    }
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.success && !res.mfaRequired) {
          this.handleLoginSuccess(res);
        }
      })
    );
  }

  verifyOTP(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp }).pipe(
      tap((res: any) => {
        if (res.success) {
          this.handleLoginSuccess(res);
        }
      })
    );
  }

  resendOTP(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-otp`, { email });
  }

  checkLockoutStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/login/status`);
  }

  getCaptcha(): Observable<any> {
    return this.http.get(`${this.apiUrl}/captcha/generate`);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  logout() {
    const isAuth = this.isLoggedIn();
    if (isAuth) {
      // Fire request to backend to blacklist the token (which is in the cookie now)
      this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession() {
    localStorage.removeItem('lib_session');
    this.#sessionData.set(null);
    this.isLoggedIn.set(false);
    this.userRole.set(null);
    this.clearInternalNavigation();
    this.router.navigate(['/']);
  }
}
