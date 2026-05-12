import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { MemberService } from '../../services/member.service';
import { IssueService } from '../../services/issue.service';
import { MemberProfile } from '../../models/member.model';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { UPLOADS_BASE } from '../../core/api.config';
import { BookManagerComponent } from './book-manager/book-manager';
import { MemberManagerComponent } from './member-manager/member-manager';
import { CirculationDeskComponent } from './circulation-desk/circulation-desk';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { FineManagerComponent } from './fine-manager/fine-manager';
import { ModalService } from '../../services/modal.service';
import { MemberProfileComponent } from './member-profile/member-profile';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [CommonModule, BookManagerComponent, MemberManagerComponent, CirculationDeskComponent, FineManagerComponent, MemberProfileComponent],
  templateUrl: './librarian-dashboard.html',
  styleUrl: './librarian-dashboard.css',
})
export class LibrarianDashboardComponent implements OnDestroy {
  private authService   = inject(AuthService);
  private memberService = inject(MemberService);
  private issueService  = inject(IssueService);
  private adminService  = inject(AdminService);
  private router        = inject(Router);
  public toastService   = inject(ToastService);
  private modalService   = inject(ModalService);
  private socket: Socket;
  private routerSub: Subscription;

  readonly uploadsBase = UPLOADS_BASE;

  activeTab = 'books';
  // Profile modal state
  viewingMember    = signal<MemberProfile | null>(null);
  isProfileLoading = signal<boolean>(false);

  stats = signal<{ totalBooks: number, totalMembers: number, totalIssued: number, totalOverdue: number } | null>(null);
  today = new Date();

  constructor() {
    // Connect socket with authentication token
    this.socket = io(UPLOADS_BASE, {
      closeOnBeforeunload: false,
      auth: {
        token: localStorage.getItem('lib_token')
      }
    });
    this.setupSocketListeners();
    this.loadStats();

    // Disconnect socket cleanly before any navigation to prevent browser warning
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.socket.disconnect();
      }
    });
  }

  loadStats() {
    this.adminService.getStats().subscribe({
      next: (res) => this.stats.set(res.data),
      error: () => console.error('Failed to load dashboard stats')
    });
  }

  setupSocketListeners() {
    this.socket.on('bookOverdue', (data: any) => {
      this.toastService.error(`NOTICE: ${data.message}`);
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  logout() { 
    this.modalService.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to end your librarian session?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => this.authService.logout()
    });
  }

  openProfile(member_id: string) {
    this.isProfileLoading.set(true);
    this.viewingMember.set({ member: { member_id, name: '' } as any, history: [], stats: { total_borrowed: 0, active_issues: 0, overdue: 0, total_fines: 0 } });
    this.memberService.getMemberProfile(member_id).subscribe({
      next: (res) => { 
        this.viewingMember.set(res.data); 
        this.isProfileLoading.set(false); 
      },
      error: () => { 
        this.viewingMember.set(null); 
        this.isProfileLoading.set(false); 
        this.toastService.error('Failed to load member profile'); 
      }
    });
  }

  closeProfile() { 
    this.viewingMember.set(null); 
  }

  onModalClick(event: Event) {
    event.stopPropagation();
  }

  payFineFromProfile(issue_id: number) {
    this.issueService.payFine(issue_id).subscribe({
      next: (res) => {
        this.toastService.success(res.message);
        if (this.viewingMember()) this.openProfile(this.viewingMember()!.member.member_id);
      },
      error: (e) => this.toastService.error(e.error?.message || 'Failed to process payment')
    });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
