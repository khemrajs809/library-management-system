import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { IdleTimeoutService } from '../../../services/idle-timeout.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ModalService } from '../../../services/modal.service';
import { RefreshButtonComponent } from '../../../shared/components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule, NgOptimizedImage, RefreshButtonComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public authService = inject(AuthService);
  public idleService = inject(IdleTimeoutService);
  private modalService = inject(ModalService);

  logout() {
    this.modalService.confirm({
      title: 'Logout Confirmation',
      message: 'Are you sure you want to log out of your session?',
      confirmText: 'Log Out',
      cancelText: 'Stay Logged In',
      type: 'warning',
      onConfirm: () => {
        this.authService.logout();
      }
    });
  }
}
