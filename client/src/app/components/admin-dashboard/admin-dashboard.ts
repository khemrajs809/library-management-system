import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal.service';
import { StaffManagerComponent } from './staff-manager/staff-manager';
import { ArchiveManagerComponent } from './archive-manager/archive-manager';
import { AuditLogViewerComponent } from './audit-log-viewer/audit-log-viewer';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StaffManagerComponent, ArchiveManagerComponent, AuditLogViewerComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  activeTab = 'staff';

  setTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
    this.modalService.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to end your administrative session?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => this.authService.logout()
    });
  }
}
