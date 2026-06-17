import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-book-shortage-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-shortage-alerts.html',
  styleUrl: './book-shortage-alerts.css'
})
export class BookShortageAlerts {
  @Input() data: any[] = [];

  get shortages() {
    if (!this.data) return [];
    return this.data.map(b => {
      let severityClass = 'badge-warning';
      let severityLabel = 'Moderate';

      if (b.daysOutOfStock > 30 || b.waitingRequests > 5) {
        severityClass = 'badge-danger';
        severityLabel = 'Critical';
      } else if (b.daysOutOfStock > 14 || b.waitingRequests > 2) {
        severityClass = 'badge-orange';
        severityLabel = 'High';
      }

      return {
        ...b,
        cover: b.cover || 'assets/placeholder-book.png',
        severityClass,
        severityLabel
      };
    });
  }
}
