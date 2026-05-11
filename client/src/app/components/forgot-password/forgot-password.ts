import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';
import { SpinnerComponent } from '../animations/spinner/spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, FormsModule, SpinnerComponent, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  step = signal<number>(1); // 1: Email, 2: OTP & New Password
  isLoading = signal<boolean>(false);
  error = signal<string>('');

  data = {
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  };

  onRequestOTP() {
    if (!this.data.email) return;

    this.isLoading.set(true);
    this.error.set('');

    this.authService.forgotPassword(this.data.email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.success(res.message || 'Reset code sent!');
        this.step.set(2);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Failed to send reset code');
        this.toastService.error(this.error());
      }
    });
  }

  onResetPassword() {
    if (this.data.newPassword !== this.data.confirmPassword) {
      this.toastService.error('Passwords do not match');
      return;
    }

    if (this.data.newPassword.length < 6) {
      this.toastService.error('Password must be at least 6 characters');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.resetPassword(this.data).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.success('Password updated successfully!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Reset failed');
        this.toastService.error(this.error());
      }
    });
  }

  backToStep1() {
    this.step.set(1);
    this.data.otp = '';
    this.data.newPassword = '';
    this.data.confirmPassword = '';
  }
}
