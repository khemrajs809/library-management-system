import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-visual-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visual-analytics.html',
  styleUrl: './visual-analytics.css'
})
export class VisualAnalytics {
  @Input() data: any;

  get monthlyTrends() {
    if (!this.data?.monthlyTrends) return [];
    
    // Process height for bars based on max value to make it dynamic
    const maxVal = Math.max(...this.data.monthlyTrends.map((d: any) => Math.max(Number(d.borrowed), Number(d.returned))), 1);
    
    return this.data.monthlyTrends.map((d: any) => ({
      ...d,
      borrowedHeight: (Number(d.borrowed) / maxVal * 100) + '%',
      returnedHeight: (Number(d.returned) / maxVal * 100) + '%'
    }));
  }

  get categoryDelays() {
    if (!this.data?.categoryDelays) return [];
    
    const colors = ['#e63946', '#fcc419', '#4dabf7', '#51cf66', '#845ef7'];
    return this.data.categoryDelays.map((c: any, index: number) => ({
      ...c,
      color: colors[index % colors.length]
    }));
  }

  get maxGraphValue() {
    if (!this.data?.monthlyTrends) return 1000;
    const maxVal = Math.max(...this.data.monthlyTrends.map((d: any) => Math.max(Number(d.borrowed), Number(d.returned))), 100);
    return Math.ceil(maxVal / 100) * 100;
  }
}
