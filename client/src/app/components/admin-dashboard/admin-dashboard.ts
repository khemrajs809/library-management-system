import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal.service';
import { StaffManagerComponent } from './staff-manager/staff-manager';
import { DeletedBooksComponent } from './deleted-books/deleted-books';
import { DeletedMembersComponent } from './deleted-members/deleted-members';
import { AuditLogViewerComponent } from './audit-log-viewer/audit-log-viewer';
import { SessionMonitorComponent } from './session-monitor/session-monitor';
import { SecurityIncidentsComponent } from './security-incidents/security-incidents';

import { AnnouncementManagerComponent } from './announcement-manager/announcement-manager';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterModule, StaffManagerComponent, DeletedBooksComponent, DeletedMembersComponent, AuditLogViewerComponent, SessionMonitorComponent, AnnouncementManagerComponent, SecurityIncidentsComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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

