import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../../../../models/book.model';

@Component({
  selector: 'app-book-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-details-modal.html',
  styleUrl: './book-details-modal.css'
})
export class BookDetailsModalComponent {
  @Input() isOpen = false;
  @Input() book: Book | null = null;
  @Input() history: any[] = [];
  @Input() copies: any[] = [];
  @Input() copyPage = 1;

  @Output() onClose = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<Book>();
  @Output() onSetCopyPage = new EventEmitter<number>();
  @Output() onPrevCopyPage = new EventEmitter<void>();
  @Output() onNextCopyPage = new EventEmitter<void>();

  getPaginatedCopies() {
    const start = (this.copyPage - 1) * 12;
    return this.copies.slice(start, start + 12);
  }

  getCopyTotalPages() {
    return Math.ceil(this.copies.length / 12) || 1;
  }

  getCopyPaginationArray() {
    const totalPages = this.getCopyTotalPages();
    const current = this.copyPage;
    const maxVisible = 10;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
