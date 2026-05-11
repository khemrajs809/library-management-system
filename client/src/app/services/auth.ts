import { Injectable, inject, signal } from '@angular/core';
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
  private apiUrl = API_BASE;

  #token = signal<string | null>(localStorage.getItem('lib_token'));
  
  isLoggedIn = signal<boolean>(!!this.#token());
  userRole = signal<string | null>(this.getRoleFromToken(this.#token()));
  sessionRemaining = signal<string>('');
  private sessionTimerInterval: any;

  constructor() {
    if (this.isLoggedIn()) {
      this.startSessionTimer();
    }
  }

  private getRoleFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch (e) {
      return null;
    }
  }

  private startSessionTimer() {
    if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
    
    this.sessionTimerInterval = setInterval(() => {
      const token = this.#token();
      if (!token) {
        clearInterval(this.sessionTimerInterval);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        const diff = exp - now;

        if (diff <= 0) {
          clearInterval(this.sessionTimerInterval);
          this.logout();
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        this.sessionRemaining.set(
          `${hours}h ${minutes}m ${seconds}s`
        );
      } catch (e) {
        clearInterval(this.sessionTimerInterval);
      }
    }, 1000);
  }

  private handleLoginSuccess(res: any) {
    if (res.success) {
      localStorage.setItem('lib_token', res.token);
      this.#token.set(res.token);
      this.isLoggedIn.set(true);
      const role = this.getRoleFromToken(res.token);
      this.userRole.set(role);
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
    const currentToken = this.#token();
    if (currentToken) {
      // Fire request to backend to blacklist the token
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${currentToken}` }
      }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession() {
    localStorage.removeItem('lib_token');
    this.#token.set(null);
    this.isLoggedIn.set(false);
    this.userRole.set(null);
    this.router.navigate(['/']);
  }
}
