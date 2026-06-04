import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Issue } from '../../../../../models/issue.model';
import { UPLOADS_BASE } from '../../../../../core/api.config';

@Component({
  selector: 'app-active-issues-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-issues-table.component.html',
  styleUrl: './active-issues-table.component.css'
})
export class ActiveIssuesTableComponent {
  @Input() set issues(val: Issue[]) { this._issues.set(val || []); }
  _issues = signal<Issue[]>([]);

  @Input() set query(val: string) { this._query.set(val || ''); }
  _query = signal<string>('');

  @Input() set page(val: number) { this._page.set(val || 1); }
  _page = signal<number>(1);

  @Input() isLoading = false;

  @Output() onSearch = new EventEmitter<string>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onReturn = new EventEmitter<number>();
  @Output() onRenew = new EventEmitter<number>();
  @Output() onMarkLost = new EventEmitter<number>();
  @Output() onPayFine = new EventEmitter<number>();
  
  readonly uploadsBase = UPLOADS_BASE;
  pageSize = 10;

  filteredIssues = computed(() => {
    const q = this._query().toLowerCase().trim();
    if (!q) return this._issues();
    return this._issues().filter(i =>
      (i.memberName?.toLowerCase().includes(q)) ||
      (i.bookTitle?.toLowerCase().includes(q)) ||
      (i.memberId?.toLowerCase().includes(q)) ||
      (i.bookId?.toString().includes(q))
    );
  });

  paginatedIssues = computed(() => {
    const start = (this._page() - 1) * this.pageSize;
    return this.filteredIssues().slice(start, start + this.pageSize);
  });

  pagination = computed(() => {
    const total = this.filteredIssues().length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;
    const current = this._page();
    const maxVisible = 10;
    
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      if (i >= 1 && i <= totalPages) pages.push(i);
    }
    return { page: current, totalPages, total, pages };
  });

  isOverdue = (issue: Issue) => {
    const due = new Date(issue.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    return today > due;
  };
}
