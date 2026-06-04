import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { API_BASE } from '../../../core/api.config';

@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log-viewer.component.html',
  styleUrl: './audit-log-viewer.component.css'
})
export class AuditLogViewerComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  logs = signal<any[]>([]);
  pagination = signal<any>({ page: 1, limit: 15, totalPages: 1, total: 0 });

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs(page = 1) {
    this.http.get<any>(`${API_BASE}/admin/audit-logs?page=${page}&limit=15`).subscribe({
      next: (res) => {
        this.logs.set(res.data);
        if (res.pagination) this.pagination.set(res.pagination);
      },
      error: () => this.toastService.error('Failed to load audit logs')
    });
  }

  nextPage() {
    const p = this.pagination();
    if (p.page < p.totalPages) this.loadLogs(p.page + 1);
  }

  prevPage() {
    const p = this.pagination();
    if (p.page > 1) this.loadLogs(p.page - 1);
  }

  goToPage(p: number) {
    this.loadLogs(p);
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

  parseDetails(detailsStr: string) {
    try {
      return JSON.parse(detailsStr);
    } catch {
      return {};
    }
  }
}
