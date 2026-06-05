import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { SpinnerComponent } from '../../shared/animations/spinner/spinner.component';
import { Carousel3DComponent } from '../../shared/animations/carousel/carousel.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, SpinnerComponent, Carousel3DComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  
  credentials = {
    email: '',
    password: '',
    captchaId: '',
    captchaText: ''
  };

  captchaSvg = signal<any>(null);
  captchaError = signal<string>('');
  generalError = signal<string>('');
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  lockoutTimer = signal<number>(0);
  
  // MFA State
  isMfaRequired = signal<boolean>(false);
  otpCode = '';
  maskedEmail = signal<string>('');
  resendTimer = signal<number>(0);
  private resendInterval: any;
  
  private timerInterval: any;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      if (this.authService.isInternalNavigation()) {
        const role = this.authService.userRole();
        if (role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/librarian/dashboard']);
        }
        return;
      } else {
        // Logged in but no internal navigation flag (e.g. new tab/pasted URL)
        // We clear the session to force a fresh login in this tab
        this.authService.logout();
      }
    }

    this.loadCaptcha();
    
    // Ask the backend directly if we are currently locked out (no frontend state needed)
    this.authService.checkLockoutStatus().subscribe({
      error: (err) => {
        if (err.status === 429) {
           let waitTime = 60;
           const retryAfter = err.headers?.get('Retry-After');
           const rateLimitReset = err.headers?.get('RateLimit-Reset');
           
           if (retryAfter) {
             waitTime = parseInt(retryAfter, 10);
           } else if (rateLimitReset) {
             const resetTime = parseInt(rateLimitReset, 10);
             const currentSeconds = Math.floor(Date.now() / 1000);
             if (resetTime > currentSeconds) {
               waitTime = resetTime - currentSeconds;
             }
           }
           this.startLockoutTimer(waitTime);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.resendInterval) clearInterval(this.resendInterval);
  }

  loadCaptcha() {
    this.authService.getCaptcha().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.credentials.captchaId = res.captchaId;
          this.captchaSvg.set('data:image/svg+xml;utf8,' + encodeURIComponent(res.captchaImage));
          this.credentials.captchaText = '';
          this.captchaError.set(''); // Clear error when new captcha is loaded
        }
      },
      error: (err) => {
        console.error('Failed to load captcha', err);
      }
    });
  }

  togglePassword() {
    this.showPassword.update(val => !val);
  }

  startLockoutTimer(seconds: number) {
    this.lockoutTimer.set(seconds);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.lockoutTimer.update(t => t - 1);
      if (this.lockoutTimer() <= 0) {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onLogin() {
    if (this.lockoutTimer() > 0) return;
    
    this.isLoading.set(true);
    this.generalError.set('');
    this.captchaError.set('');
    
    console.log('[DEBUG] Dispatching login request:', { 
      email: this.credentials.email, 
      captchaId: this.credentials.captchaId, 
      captchaText: this.credentials.captchaText 
    });
    
    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        // 4 second simulated delay for effect
        setTimeout(() => {
          this.isLoading.set(false);
          
          if (res.mfaRequired) {
            this.isMfaRequired.set(true);
            this.maskedEmail.set(res.email);
            this.toastService.info('Please enter the security code sent to your email.');
            this.startResendTimer();
          } else {
            this.toastService.success('Login successful!');
            this.navigateToDashboard();
          }
        }, 400); // Reducing delay for better UX since MFA is an extra step
      },
      error: (err) => {
        const msg = err.error?.message || 'Login failed';
        const isCaptchaError = msg.toLowerCase().includes('captcha');
        
        if (isCaptchaError) {
          // Captcha errors: show immediately, don't fake the spinner
          this.isLoading.set(false);
          this.loadCaptcha(); // Reload captcha on failure
          this.captchaError.set(msg);
          this.generalError.set('');
        } else {
          // Email/Password/Other errors: fake the 4s "Authentication" spinner
          setTimeout(() => {
            this.isLoading.set(false);
            this.loadCaptcha(); // Reload captcha on failure
            this.generalError.set(msg);
            this.captchaError.set('');
            
            if (err.status === 429) {
               let waitTime = 60;
               const retryAfter = err.headers?.get('Retry-After');
               const rateLimitReset = err.headers?.get('RateLimit-Reset');
               
               if (retryAfter) {
                 waitTime = parseInt(retryAfter, 10);
               } else if (rateLimitReset) {
                 // express-rate-limit RateLimit-Reset is typically a Unix timestamp in seconds
                 const resetTime = parseInt(rateLimitReset, 10);
                 const currentSeconds = Math.floor(Date.now() / 1000);
                 if (resetTime > currentSeconds) {
                   waitTime = resetTime - currentSeconds;
                 }
               }
               
               this.toastService.error(msg || `Too many attempts. Please try again in ${waitTime} seconds.`);
               this.startLockoutTimer(waitTime);
            } else {
               this.toastService.error(msg);
            }
          }, 4000);
        }
      }
    });
  }

  onVerifyOTP() {
    if (!this.otpCode) return;

    this.isLoading.set(true);
    this.generalError.set('');

    this.authService.verifyOTP(this.credentials.email, this.otpCode).subscribe({
      next: () => {
        setTimeout(() => {
          this.isLoading.set(false);
          this.toastService.success('Identity verified!');
          this.navigateToDashboard();
        }, 1000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.generalError.set(err.error?.message || 'Verification failed');
        this.toastService.error(err.error?.message || 'Invalid code');
      }
    });
  }

  private navigateToDashboard() {
    const role = this.authService.userRole();
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/librarian/dashboard']);
    }
  }

  onResendOTP() {
    if (this.resendTimer() > 0) return;

    this.isLoading.set(true);
    this.authService.resendOTP(this.credentials.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.otpCode = ''; // Clear old OTP input
        this.toastService.success('A new security code has been sent!');
        this.startResendTimer();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err.error?.message || 'Failed to resend code');
      }
    });
  }

  private startResendTimer() {
    this.resendTimer.set(60);
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      this.resendTimer.update(t => t - 1);
      if (this.resendTimer() <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  resetMFA() {
    this.isMfaRequired.set(false);
    this.otpCode = '';
    this.generalError.set('');
    this.resendTimer.set(0);
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.loadCaptcha();
  }

  clearCaptchaError() {
    this.captchaError.set('');
  }
}
