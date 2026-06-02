import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Issue } from '../../../../../models/issue.model';
import { UPLOADS_BASE } from '../../../../../core/api.config';

@Component({
  selector: 'app-return-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-history.html',
  styleUrl: './return-history.css'
})
export class ReturnHistoryComponent {
  @Input() set history(val: Issue[]) { this._history.set(val); }
  _history = signal<Issue[]>([]);
  @Input() query = '';
  @Input() page = 1;
  @Input() isLoading = false;

  @Output() onSearch = new EventEmitter<string>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onPayFine = new EventEmitter<number>();
  readonly uploadsBase = UPLOADS_BASE;

  pageSize = 10;

  filteredHistory = computed(() => {
    const q = this.query.toLowerCase();
    if (!q) return this._history();
    return this._history().filter(h =>
      h.memberName.toLowerCase().includes(q) ||
      h.bookTitle.toLowerCase().includes(q) ||
      h.memberId.toLowerCase().includes(q) ||
      h.bookId.toString().includes(q)
    );
  });

  paginatedHistory = computed(() => {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredHistory().slice(start, start + this.pageSize);
  });

  pagination = computed(() => {
    const total = this.filteredHistory().length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;
    const current = this.page;
    const maxVisible = 10;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return { page: current, totalPages, total, pages };
  });
}
