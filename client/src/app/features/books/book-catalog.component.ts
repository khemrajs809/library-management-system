import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BookService } from '../../services/book.service';
import { SpinnerComponent } from '../../shared/animations/spinner/spinner.component';
import { CustomClockComponent } from '../../shared/components/custom-clock/custom-clock.component';

@Component({
  selector: 'app-book-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SpinnerComponent, CustomClockComponent],
  templateUrl: './book-catalog.component.html',
  styleUrl: './book-catalog.component.css'
})
export class BookCatalogComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  books = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  // Filters
  searchQuery = signal<string>('');
  selectedStream = signal<string>('');
  selectedAuthor = signal<string>('');
  inStockOnly = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalBooks = signal<number>(0);
  
  // Dynamic filters
  streams = signal<string[]>([]);
  authors = signal<string[]>([]);
  
  // UI State
  showFilters = signal<boolean>(false);
  
  // Live Search
  searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngOnInit() {
    this.fetchFilterOptions();
    
    // Setup live search
    this.searchSubscription = this.searchSubject.pipe(
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.applyFilters();
    });
    
    this.route.queryParams.subscribe(params => {
      this.searchQuery.set(params['q'] || '');
      this.selectedStream.set(params['stream'] || '');
      this.selectedAuthor.set(params['author'] || '');
      this.inStockOnly.set(params['in_stock'] === 'true');
      this.currentPage.set(Number(params['page']) || 1);
      
      this.fetchBooks();
    });
  }

  fetchFilterOptions() {
    this.bookService.getFilterOptions().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.streams.set(res.data.streams || []);
          this.authors.set(res.data.authors || []);
        }
      },
      error: (err) => console.error('Error fetching filter options:', err)
    });
  }

  fetchBooks() {
    this.isLoading.set(true);
    const availability = this.inStockOnly() ? 'in_stock' : '';
    
    this.bookService.getBooks(
      this.searchQuery(),
      this.currentPage(),
      12, // limit per page
      this.selectedAuthor(),
      this.selectedStream(),
      availability
    ).subscribe({
      next: (res) => {
        this.books.set(res.data || []);
        this.totalBooks.set(res.pagination.total || 0);
        this.totalPages.set(res.pagination.totalPages || 1);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching books:', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  applyFilters() {
    this.currentPage.set(1);
    this.updateUrlAndFetch();
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedStream.set('');
    this.selectedAuthor.set('');
    this.inStockOnly.set(false);
    this.currentPage.set(1);
    this.updateUrlAndFetch();
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.updateUrlAndFetch();
  }

  private updateUrlAndFetch() {
    const queryParams: any = {};
    if (this.searchQuery()) queryParams.q = this.searchQuery();
    if (this.selectedStream()) queryParams.stream = this.selectedStream();
    if (this.selectedAuthor()) queryParams.author = this.selectedAuthor();
    if (this.inStockOnly()) queryParams.in_stock = 'true';
    if (this.currentPage() > 1) queryParams.page = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: ''
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
