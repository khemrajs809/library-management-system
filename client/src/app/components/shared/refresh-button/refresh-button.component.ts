import { Component, inject } from '@angular/core';

import { RefreshService } from '../../../services/refresh.service';

@Component({
  selector: 'app-refresh-button',
  standalone: true,
  imports: [],
  template: `
    <button 
      class="refresh-btn" 
      [class.spinning]="refreshService.isRefreshing()"
      (click)="onRefresh()"
      [title]="refreshService.isRefreshing() ? 'Refreshing...' : 'Refresh Page Data'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 16h5v5"></path>
      </svg>
      <span class="refresh-tooltip">Sync Data</span>
    </button>
  `,
  styles: [`
    .refresh-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      padding: 0;
      margin: 0 0.5rem;
    }

    .refresh-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
      border-color: #94a3b8;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .refresh-btn:active {
      transform: translateY(0);
      box-shadow: none;
    }

    .refresh-btn.spinning {
      background: #f0fdf4;
      border-color: #16a34a;
      color: #16a34a;
      cursor: wait;
    }

    .refresh-btn.spinning svg {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .refresh-tooltip {
      position: absolute;
      top: 100%;
      right: 50%;
      transform: translateX(50%) translateY(8px);
      background: #1e293b;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .refresh-btn:hover .refresh-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(50%) translateY(4px);
    }
  `]
})
export class RefreshButtonComponent {
  refreshService = inject(RefreshService);

  onRefresh() {
    this.refreshService.triggerRefresh();
  }
}
