import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { API_BASE } from '../../../core/api.config';
import { ModalService } from '../../../services/modal.service';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-session-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-monitor.html',
  styleUrl: './session-monitor.css'
})
export class SessionMonitorComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);
  public refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  // Sessions and statistics
  sessions = signal<any[]>([]);
  stats = signal<any>({
    kpi: { totalLogins: 0, successful: 0, failed: 0, blocked: 0, online: 0, highRisk: 0 },
    devices: [],
    browsers: [],
    weeklyTrends: [],
    alerts: []
  });

  // State signals
  loading = signal(false);
  statsLoading = signal(false);
  selectedSession = signal<any | null>(null);
  sessionActions = signal<any[]>([]);
  actionsLoading = signal(false);

  // Filters signals
  startDate = signal('');
  endDate = signal('');
  userFilter = signal('');
  statusFilter = signal('');
  deviceFilter = signal('');
  browserFilter = signal('');
  searchQuery = signal('');

  // Pagination signal
  pagination = signal<any>({ page: 1, limit: 12, totalPages: 1, total: 0 });

  // Auto Refresh
  autoRefreshEnabled = signal(true);
  private refreshIntervalId: any = null;

  ngOnInit() {
    this.loadSessions();
    this.loadStats();
    this.startAutoRefresh();

    // Listen for global refresh signals
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.refreshData();
    });
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  refreshData() {
    this.loadStats();
    this.loadSessions();
    // Complete the refresh animation after a short delay
    setTimeout(() => this.refreshService.completeRefresh(), 800);
  }

  // Load KPI and chart statistics
  loadStats() {
    this.statsLoading.set(true);
    this.http.get<any>(`${API_BASE}/admin/sessions/stats`).subscribe({
      next: (res) => {
        if (res.success) {
          setTimeout(() => this.stats.set(res.data), 0);
        }
        setTimeout(() => this.statsLoading.set(false), 0);
      },
      error: () => {
        this.toastService.error('Failed to load session monitoring statistics');
        setTimeout(() => this.statsLoading.set(false), 0);
      }
    });
  }

  // Load session list with pagination and filters
  loadSessions(page = 1) {
    this.loading.set(true);
    
    // Build query params
    let url = `${API_BASE}/admin/sessions?page=${page}&limit=12`;
    
    if (this.startDate()) url += `&startDate=${this.startDate()}`;
    if (this.endDate()) url += `&endDate=${this.endDate()}`;
    if (this.userFilter()) url += `&user=${encodeURIComponent(this.userFilter())}`;
    if (this.statusFilter()) url += `&status=${this.statusFilter()}`;
    if (this.deviceFilter()) url += `&deviceType=${this.deviceFilter()}`;
    if (this.browserFilter()) url += `&browser=${this.browserFilter()}`;
    if (this.searchQuery()) url += `&search=${encodeURIComponent(this.searchQuery())}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success) {
          console.log('DEBUG FRONTEND SESSIONS:', res.data);
          this.sessions.set(res.data);
          if (res.pagination) {
            this.pagination.set(res.pagination);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load login sessions');
        this.loading.set(false);
      }
    });
  }

  // Fetch actions timeline for detailed modal view
  loadSessionActions(session: any) {
    this.selectedSession.set(session);
    this.actionsLoading.set(true);
    this.sessionActions.set([]);

    this.http.get<any>(`${API_BASE}/admin/sessions/${session.id}/actions`).subscribe({
      next: (res) => {
        if (res.success) {
          this.sessionActions.set(res.data);
        }
        this.actionsLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load session action timeline');
        this.actionsLoading.set(false);
      }
    });
  }

  // Terminate/Revoke an active session
  terminateSession(id: number, email: string) {
    this.modalService.confirm({
      title: 'Force Logout Session',
      message: `Are you sure you want to terminate the active session for "${email}"? The user will be logged out in real-time.`,
      type: 'danger',
      confirmText: 'Terminate Session',
      onConfirm: () => {
        this.http.post<any>(`${API_BASE}/admin/sessions/${id}/terminate`, {}).subscribe({
          next: (res) => {
            this.toastService.success(res.message || 'Session terminated successfully');
            this.loadSessions(this.pagination().page);
            this.loadStats();
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Failed to terminate session');
          }
        });
      }
    });
  }

  // Clean filters and reload
  resetFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.userFilter.set('');
    this.statusFilter.set('');
    this.deviceFilter.set('');
    this.browserFilter.set('');
    this.searchQuery.set('');
    this.loadSessions(1);
  }

  // Auto Refresh management
  toggleAutoRefresh() {
    this.autoRefreshEnabled.update(val => !val);
    if (this.autoRefreshEnabled()) {
      this.startAutoRefresh();
      this.toastService.success('Real-time auto refresh enabled');
    } else {
      this.stopAutoRefresh();
      this.toastService.info('Real-time auto refresh paused');
    }
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshIntervalId = setInterval(() => {
      // Quietly reload sessions and stats
      this.http.get<any>(`${API_BASE}/admin/sessions?page=${this.pagination().page}&limit=12`).subscribe({
        next: (res) => {
          if (res.success) {
            setTimeout(() => this.sessions.set(res.data), 0);
          }
        }
      });
      this.http.get<any>(`${API_BASE}/admin/sessions/stats`).subscribe({
        next: (res) => {
          if (res.success) {
            setTimeout(() => this.stats.set(res.data), 0);
          }
        }
      });
    }, 12000); // refresh every 12 seconds
  }

  private stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  // Pagination helpers
  nextPage() {
    const p = this.pagination();
    if (p.page < p.totalPages) this.loadSessions(p.page + 1);
  }

  prevPage() {
    const p = this.pagination();
    if (p.page > 1) this.loadSessions(p.page - 1);
  }

  goToPage(p: number) {
    this.loadSessions(p);
  }

  paginationArray = computed(() => {
    const p = this.pagination();
    const current = p.page || 1;
    const totalPages = p.totalPages || 1;
    
    const maxVisible = 10;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  // Modal control
  closeModal() {
    this.selectedSession.set(null);
    this.sessionActions.set([]);
  }

  // EXPORT UTILITIES

  // Export to CSV
  exportToCSV() {
    try {
      this.toastService.info('Preparing CSV Export...');
      const headers = ['Session ID', 'User ID', 'Name', 'Email', 'Role', 'Login Time', 'Logout Time', 'Status', 'IP Address', 'Browser', 'OS', 'Device Type', 'Location', 'Risk Level', 'Risk Score'];
      const rows = this.sessions().map(s => [
        s.id,
        s.userId || 'N/A',
        s.userName || 'N/A',
        s.email,
        s.role || 'N/A',
        this.safeDate(s.loginTime),
        s.logoutTime ? this.safeDate(s.logoutTime) : 'N/A',
        s.status,
        s.ipAddress,
        s.browser,
        s.os,
        s.deviceType,
        s.location,
        s.riskLevel,
        s.riskScore
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `LMS_Login_Sessions_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.toastService.success('CSV file exported successfully!');
    } catch {
      this.toastService.error('Failed to export CSV');
    }
  }

  // Export to Excel
  exportToExcel() {
    this.exportToCSV(); // For frontend with no heavy external libraries, CSV is the optimal format that auto-loads into Excel
  }

  // Export to PDF (Print mode / layout trigger)
  exportToPDF() {
    this.toastService.info('Opening browser print window...');
    window.print();
  }

  // Calculations
  safeDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  }

  formatDuration(login: string, logout: string | null, status: string, realtimeStatus: string): string {
    if (!login) return 'N/A';
    const start = new Date(login).getTime();
    if (isNaN(start)) return 'Invalid Date';
    
    if (status !== 'successful' && !logout) {
      return 'N/A';
    }

    let end;
    if (logout) {
      end = new Date(logout).getTime();
    } else if (realtimeStatus === 'offline') {
      return 'Session Expired';
    } else {
      end = Date.now();
    }

    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    
    if (diffMins < 1) {
      return 'Under a minute';
    }
    if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
    }
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  }

  getRiskBadgeClass(riskLevel: string): string {
    switch(riskLevel?.toLowerCase()) {
      case 'high': return 'badge bg-red';
      case 'medium': return 'badge bg-orange';
      default: return 'badge bg-green';
    }
  }

  getStatusBadgeClass(status: string, realtimeStatus: string): string {
    if (status === 'failed') return 'badge bg-red';
    if (status === 'blocked') return 'badge bg-dark-red';
    if (status === 'suspicious') return 'badge bg-purple';
    
    if (realtimeStatus === 'online') return 'badge bg-active-green';
    if (realtimeStatus === 'idle') return 'badge bg-orange';
    return 'badge bg-grey';
  }

  getStatusLabel(status: string, realtimeStatus: string): string {
    if (status === 'failed') return 'FAILED';
    if (status === 'blocked') return 'BLOCKED';
    if (status === 'suspicious') return 'SUSPICIOUS';
    
    if (realtimeStatus === 'online') return 'ACTIVE';
    if (realtimeStatus === 'idle') return 'IDLE';
    return 'OFFLINE';
  }
}
