import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { StaffManagerComponent } from './staff-manager/staff-manager.component';
import { DeletedBooksComponent } from './deleted-books/deleted-books.component';
import { DeletedMembersComponent } from './deleted-members/deleted-members.component';
import { AuditLogViewerComponent } from './audit-log-viewer/audit-log-viewer.component';
import { SessionMonitorComponent } from './session-monitor/session-monitor.component';
import { SecurityIncidentsComponent } from './security-incidents/security-incidents.component';

import { AnnouncementManagerComponent } from './announcement-manager/announcement-manager.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterModule, StaffManagerComponent, DeletedBooksComponent, DeletedMembersComponent, AuditLogViewerComponent, SessionMonitorComponent, AnnouncementManagerComponent, SecurityIncidentsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
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

