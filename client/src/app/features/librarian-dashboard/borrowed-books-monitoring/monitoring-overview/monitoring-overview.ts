import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitoring-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitoring-overview.html',
  styleUrl: './monitoring-overview.css'
})
export class MonitoringOverview {
  @Input() data: any;

  get stats() {
    return this.data || {
      totalBorrowed: 0,
      dueToday: 0,
      overdue: 0,
      criticalDelay: 0,
      pendingFines: 0,
      membersWithOverdue: 0,
      mostBorrowedBook: 'N/A',
      shortageAlerts: 0
    };
  }
}
