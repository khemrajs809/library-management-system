import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../../../../models/book.model';
import { SkeletonLoaderComponent } from '../../../../../components/animations/skeleton-loader/skeleton-loader';
import { FadeInComponent } from '../../../../../components/animations/fade-in/fade-in';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, FadeInComponent],
  templateUrl: './book-list.html',
  styleUrl: './book-list.css'
})
export class BookTableComponent {
  @Input() books: Book[] = [];
  @Input() pagination: any = { page: 1, limit: 50, totalPages: 1, total: 0 };
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() isLoading = false;
  @Input() isImporting = false;
  @Input() bookSearch = '';
  @Input() isEditing = false;

  @Output() onEdit = new EventEmitter<Book>();
  @Output() onDelete = new EventEmitter<Book>();
  @Output() onViewCopies = new EventEmitter<Book>();
  @Output() onPrintBarcode = new EventEmitter<Book>();
  @Output() onViewDetails = new EventEmitter<Book>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onSearchChange = new EventEmitter<string>();
  @Output() onCsvImport = new EventEmitter<any>();
  @Output() onToggleView = new EventEmitter<void>();

  paginationArray = computed(() => {
    const p = this.pagination;
    const current = p.page || 1;
    const totalPages = p.totalPages || 1;
    
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
    return pages;
  });

  handleSearch(e: any) {
    this.onSearchChange.emit(e.target.value);
  }

  handleCsv(e: any) {
    this.onCsvImport.emit(e);
  }
}
