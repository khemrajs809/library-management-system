import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IssueService } from '../../../services/issue.service';
import { ToastService } from '../../../services/toast.service';
import { ModalService } from '../../../services/modal.service';
import { UPLOADS_BASE } from '../../../core/api.config';

@Component({
  selector: 'app-fine-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fine-manager.html',
  styleUrl: './fine-manager.css'
})
export class FineManagerComponent implements OnInit {
  private issueService = inject(IssueService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);
  
  readonly uploadsBase = UPLOADS_BASE;

  records = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  filterType = signal<'all' | 'lost' | 'fine' | 'unpaid' | 'paid'>('all');
  
  currentPage = signal<number>(1);
  pageSize = 10;

  filteredRecords = computed(() => {
    let filtered = this.records();
    const q = this.searchQuery().toLowerCase();

    // Filter by type
    if (this.filterType() === 'lost') {
      filtered = filtered.filter(r => r.status === 'lost');
    } else if (this.filterType() === 'fine') {
      filtered = filtered.filter(r => r.dynamicFine > 0);
    } else if (this.filterType() === 'unpaid') {
      filtered = filtered.filter(r => r.dynamicFine > 0 && r.finePaid === 0);
    } else if (this.filterType() === 'paid') {
      filtered = filtered.filter(r => r.finePaid === 1);
    }

    // Filter by search
    if (q) {
      filtered = filtered.filter(r => 
        r.memberName.toLowerCase().includes(q) ||
        r.bookTitle.toLowerCase().includes(q) ||
        r.memberId.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  });

  paginatedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRecords().slice(start, start + this.pageSize);
  });

  pagination = computed(() => {
    const total = this.filteredRecords().length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;
    const current = this.currentPage();
    
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

    return {
      page: current,
      totalPages,
      total,
      pages
    };
  });

  totalUnpaid = computed(() => {
    return this.records()
      .filter(r => r.finePaid === 0 && r.dynamicFine > 0)
      .reduce((sum, r) => sum + Number(r.dynamicFine), 0);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.issueService.getFinesAndLost().subscribe({
      next: (r) => {
        this.records.set(r.data);
        this.isLoading.set(false);
      },
      error: (e) => {
        this.toastService.error('Failed to load fines data');
        this.isLoading.set(false);
      }
    });
  }

  payFine(issueId: number, amount: number) {
    this.modalService.show({
      title: 'Confirm Payment',
      message: `Mark the fine of ₹${amount} as paid?`,
      type: 'info',
      confirmText: 'Mark Paid',
      cancelText: 'Cancel',
      onConfirm: () => {
        this.issueService.payFine(issueId).subscribe({
          next: () => {
            this.toastService.success('Fine marked as paid successfully');
            this.loadData();
          },
          error: (e) => {
            this.toastService.error(e.error?.message || 'Payment failed');
          }
        });
      }
    });
  }

  sendReminder(issueId: number) {
    this.toastService.info('Sending reminder email...');
    this.issueService.sendFineReminder(issueId).subscribe({
      next: (r) => {
        this.toastService.success(r.message || 'Reminder sent');
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Failed to send reminder');
      }
    });
  }

  nextPage() {
    if (this.currentPage() < this.pagination().totalPages) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  onFilterChange(event: any) {
    this.filterType.set(event.target.value);
    this.currentPage.set(1);
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value);
    this.currentPage.set(1);
  }
}
