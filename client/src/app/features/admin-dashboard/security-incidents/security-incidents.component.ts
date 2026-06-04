import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { API_BASE } from '../../../core/api.config';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-security-incidents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-incidents.component.html',
  styleUrl: './security-incidents.component.css'
})
export class SecurityIncidentsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  public refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  stats = signal<any>({ alerts: [] });
  statsLoading = signal(false);

  ngOnInit() {
    this.loadStats();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.refreshData();
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  refreshData() {
    this.loadStats();
    setTimeout(() => this.refreshService.completeRefresh(), 800);
  }

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
        this.toastService.error('Failed to load security incidents');
        setTimeout(() => this.statsLoading.set(false), 0);
      }
    });
  }
}
