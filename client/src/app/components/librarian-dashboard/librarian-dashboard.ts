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
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FineManagerComponent } from './fine-manager/fine-manager';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [CommonModule, BookManagerComponent, MemberManagerComponent, CirculationDeskComponent, FineManagerComponent],
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
    // Connect socket with options to prevent beforeunload dialog
    this.socket = io(UPLOADS_BASE, {
      closeOnBeforeunload: false  // Prevents browser dialog on back/navigation
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
        setTimeout(() => this.renderProfileBarcode(), 100);
      },
      error: () => { this.viewingMember.set(null); this.isProfileLoading.set(false); this.toastService.error('Failed to load member profile'); }
    });
  }

  renderProfileBarcode() {
    const svg = document.getElementById('profileBarcodeSvg');
    const pdfSvg = document.getElementById('pdfBarcodeSvg');
    if (this.viewingMember()) {
      const opts = { format: 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 0 };
      if (svg) JsBarcode(svg, this.viewingMember()!.member.member_id, opts);
      if (pdfSvg) JsBarcode(pdfSvg, this.viewingMember()!.member.member_id, { ...opts, height: 50, width: 2 });
    }
  }

  closeProfile() { this.viewingMember.set(null); }

  async downloadProfile() {
    const element = document.getElementById('professionalProfilePdf');
    if (!element) return;
    
    this.toastService.info('Generating official profile report...');
    
    try {
      const canvas = await html2canvas(element, {
        scale: 3, // Higher quality for official docs
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Member_Profile_${this.viewingMember()?.member.member_id}.pdf`);
      
      this.toastService.success('Profile downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      this.toastService.error('Failed to generate PDF');
    }
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
