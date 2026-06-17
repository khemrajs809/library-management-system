import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fine-management-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fine-management-panel.html',
  styleUrl: './fine-management-panel.css'
})
export class FineManagementPanel {
  @Input() stats: any;
  @Input() recentCollections: any[] = [];

  get fineStats() {
    if (!this.stats) return { totalOutstanding: 0, collectedThisMonth: 0, pendingFinesCount: 0, recoveryRate: 0 };
    
    const outstanding = Number(this.stats.totalOutstanding) || 0;
    const collected = Number(this.stats.collectedThisMonth) || 0;
    const total = outstanding + collected;
    
    const recoveryRate = total > 0 ? Math.round((collected / total) * 100) : 0;

    return {
      totalOutstanding: outstanding,
      collectedThisMonth: collected,
      pendingFinesCount: this.stats.pendingFinesCount || 0,
      recoveryRate
    };
  }
}
