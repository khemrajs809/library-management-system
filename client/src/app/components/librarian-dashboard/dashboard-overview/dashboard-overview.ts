import { Component, inject, signal, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.html',
  styleUrl: './dashboard-overview.css'
})
export class DashboardOverviewComponent implements AfterViewInit {
  private adminService = inject(AdminService);
  @Output() tabChange = new EventEmitter<string>();

  stats = signal<any>(null);
  isLoading = signal<boolean>(true);
  barColors = ['#fca5a5', '#94a3b8', '#93c5fd', '#fcd34d', '#c4b5fd', '#d6d3d1', '#fde047', '#fca5a5', '#67e8f9'];

  constructor() {
    this.adminService.getStats().subscribe({
      next: (res: any) => {
        this.stats.set(res.data);
        this.isLoading.set(false);
        setTimeout(() => this.initCharts(), 100);
      },
      error: () => this.isLoading.set(false)
    });
  }

  ngAfterViewInit() {
    if (this.stats()) {
      this.initCharts();
    }
  }

  initCharts() {
    const data = this.stats();
    if (!data) return;

    // Rental rate Line Chart
    new Chart('rentalChart', {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          { label: 'Borrowed rate', data: data.lineChart.issues, borderColor: '#2a3f74', borderWidth: 2, tension: 0.4, pointRadius: [0,0,0,0,0,0,0,6,0,0,0,0], pointBackgroundColor: '#2a3f74' },
          { label: 'User conversion', data: data.lineChart.members, borderColor: '#e07a3f', borderWidth: 2, tension: 0.4, pointRadius: [0,0,0,6,0,0,0,0,0,0,0,0], pointBackgroundColor: '#e07a3f' }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            enabled: true,
            callbacks: {
              label: (context: any) => `${context.dataset.label || ''}: ${context.raw}`
            }
          } 
        },
        scales: { 
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#7e8baf' } },
          y: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { stepSize: Math.max(1, Math.ceil(Math.max(...data.lineChart.issues, ...data.lineChart.members)/5)), font: { size: 10, weight: 'bold' }, color: '#7e8baf' } }
        }
      }
    });

    // Donut Chart (Books distribution)
    new Chart('booksDonut', {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Borrowed', 'Damaged', 'Lost'],
        datasets: [{ 
          data: [data.donutChart.available, data.donutChart.issued, data.donutChart.damaged, data.donutChart.lost], 
          backgroundColor: ['#2a3f74', '#e07a3f', '#d388c6', '#f87171'], 
          borderWidth: 5, 
          borderColor: '#f4f6fa',
          borderRadius: 5
        }]
      },
      options: { 
        responsive: true, maintainAspectRatio: false, 
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            enabled: true,
            callbacks: {
              label: (context: any) => ` ${context.label}: ${context.raw}`
            }
          } 
        }, 
        cutout: '70%'
      }
    });

    // Borrowed Rate Bar Chart
    new Chart('borrowedBarChart', {
      type: 'bar',
      data: {
        labels: data.barChart.labels,
        datasets: [{
          data: data.barChart.data,
          backgroundColor: ['#fca5a5', '#94a3b8', '#93c5fd', '#fcd34d', '#c4b5fd', '#d6d3d1', '#fde047', '#fca5a5', '#67e8f9'],
          borderRadius: 10,
          borderSkipped: false,
          barPercentage: 0.4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            enabled: true,
            callbacks: {
              label: (context: any) => ` Rate: ${context.raw}`
            }
          } 
        },
        scales: { 
          y: { 
            display: true, 
            min: 0,
            grid: { color: '#f1f5f9' },
            border: { display: false },
            ticks: { stepSize: 1, color: '#64748b', font: { size: 10 } }
          }, 
          x: { 
            display: true,
            grid: { display: false }, 
            border: { display: false }, 
            ticks: { display: true, color: '#64748b', font: { size: 10 } } 
          } 
        } 
      }
    });
  }

  getBarColor(index: number): string {
    return this.barColors[index % this.barColors.length];
  }
}
