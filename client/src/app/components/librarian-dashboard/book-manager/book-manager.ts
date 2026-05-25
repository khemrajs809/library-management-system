import { Component, inject, signal, computed, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BookService } from '../../../services/book.service';
import { ToastService } from '../../../services/toast.service';
import { Book } from '../../../models/book.model';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { ModalService } from '../../../services/modal.service';
import { BookFormComponent } from './components/book-form/book-form';
import { BookTableComponent } from './components/book-list/book-list';
import { BookCopiesModalComponent } from './components/book-copies-modal/book-copies-modal';
import { BookDetailsModalComponent } from './components/book-details-modal/book-details-modal';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-book-manager',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BookFormComponent,
    BookTableComponent,
    BookCopiesModalComponent,
    BookDetailsModalComponent
],
  templateUrl: './book-manager.html',
  styleUrl: './book-manager.css'
})
export class BookManagerComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private bookService = inject(BookService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);
  public refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  books        = signal<Book[]>([]);
  pagination   = signal<any>({ page: 1, limit: 8, totalPages: 1, total: 0 });
  viewMode     = signal<'grid' | 'list'>('grid');
  isEditing    = signal<boolean>(false);
  isLoading    = signal<boolean>(false);
  bookSearch   = signal<string>('');
  isImporting  = signal<boolean>(false);
  importResult = signal<any>(null);
  bookLabel    = signal<any | null>(null);
  selectedBookCopies = signal<any[]>([]);
  isViewingCopies    = signal<boolean>(false);
  isViewingDetails   = signal<boolean>(false);
  selectedBook       = signal<Book | null>(null);
  bookHistory        = signal<any[]>([]);
  recentActivity     = signal<any[]>([]);
  copyPage           = signal<number>(1);

  selectedBookId: string | null = null;
  selectedCover: File | null = null;

  @ViewChild('bookLabelElement') bookLabelElement!: ElementRef;

  form = this.fb.group({
    book_id:          [null as string | null],
    isbn:             [null as string | null],
    title:            ['', Validators.required],
    author:           ['', Validators.required],
    stream:           ['', Validators.required],
    publication_year: ['', Validators.required],
    publisher:        ['', Validators.required],
    edition:          ['', Validators.required],
    shelf_location:   ['', Validators.required],
    price:            [null as any, [Validators.required, Validators.min(0)]],
    quantity:         [null as any, [Validators.required, Validators.min(1)]]
  });



  constructor() { this.loadBooks(); }

  ngOnInit() {
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.refreshData();
    });

    this.form.valueChanges.subscribe(val => {
      // If the user has typed anything into any field and it's a new book without an ID yet
      const hasValue = !!(val.title || val.author || val.stream || val.publication_year || val.publisher || val.edition || val.shelf_location || val.price || val.quantity || val.isbn);
      if (hasValue && !this.isEditing() && !this.form.get('book_id')?.value) {
        this.generateIds();
      }
    });
  }

  refreshData() {
    this.loadBooks();
    setTimeout(() => this.refreshService.completeRefresh(), 800);
  }

  ngOnDestroy() {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  private checkAndGenerateIds() {
    // Keeping for reset context, but main logic handled in valueChanges
  }

  private generateIds() {
    this.bookService.generateUniqueId().subscribe({
      next: (r: any) => this.form.patchValue({ book_id: r.id }),
      error: () => this.toastService.error('Failed to generate Book ID')
    });
  }

  private addActivity(msg: string, type: 'success' | 'error') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.recentActivity.update((list: any[]) => [{ msg, type, time }, ...list].slice(0, 5));
  }

  loadBooks(q = '', page = 1) {
    this.isLoading.set(true);
    this.bookService.getBooks(q, page).subscribe({
      next: (r) => {
        this.books.set(r.data);
        if (r.pagination) this.pagination.set(r.pagination);
        this.isLoading.set(false);
      },
      error: () => { console.error('Failed to load books'); this.isLoading.set(false); }
    });
  }

  nextPage() {
    const p = this.pagination();
    if (p.page < p.totalPages) {
      this.loadBooks(this.bookSearch(), p.page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    const p = this.pagination();
    if (p.page > 1) {
      this.loadBooks(this.bookSearch(), p.page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(p: number) {
    this.loadBooks(this.bookSearch(), p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearch(e: any) { 
    this.bookSearch.set(e.target.value); 
    this.loadBooks(e.target.value, 1); 
  }

  onCoverSelected(e: any) { if (e.target.files[0]) this.selectedCover = e.target.files[0]; }

  onAddBook(fd: FormData) {
    this.bookService.addBook(fd).subscribe({
      next: (r) => { 
        this.toastService.success(r.message); 
        this.addActivity(`Added new book`, 'success');
        this.form.reset(); 
        this.selectedCover = null; 
        this.loadBooks(); 
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Failed to add book');
      }
    });
  }

  editBook(book: Book) {
    this.isEditing.set(true);
    this.selectedBook.set(book);
    this.selectedBookId = book.book_id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing.set(false); this.selectedBookId = null; this.selectedCover = null;
    this.form.reset(); 
    this.form.get('book_id')?.enable();
    this.checkAndGenerateIds();
  }


  onUpdateBook(fd: FormData) {
    if (!this.selectedBookId) return;
    this.bookService.updateBook(this.selectedBookId, fd).subscribe({
      next: (r) => { 
        this.toastService.success(r.message); 
        this.addActivity(`Updated book`, 'success');
        this.cancelEdit(); 
        this.loadBooks(); 
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Failed to update book');
      }
    });
  }

  deleteBook(book: Book) {
    this.modalService.confirm({
      title: 'Confirm Deletion',
      subtitle: 'BOOK METADATA',
      message: `Are you sure you want to move this book to trash?`,
      image: book.cover_url || 'assets/cover-placeholder.png',
      metadata: [
        { label: 'Book ID', value: book.book_id, color: '#ef4444' },
        { label: 'ISBN', value: book.isbn || 'N/A' },
        { label: 'Author', value: book.author || 'N/A' },
        { label: 'Stream', value: book.stream || 'N/A' },
        { label: 'Pub. Year', value: book.publication_year || 'N/A' },
        { label: 'Price', value: book.price ? `₹${book.price}` : 'N/A', color: '#b91c1c' },
        { label: 'Publisher', value: book.publisher || 'N/A', fullWidth: true }
      ],
      type: 'danger',
      confirmText: 'Delete Book',
      cancelText: 'Back',
      onConfirm: () => {
        this.bookService.deleteBook(book.book_id).subscribe({
          next: (r) => { 
            this.toastService.success(r.message); 
            this.addActivity(`Deleted book: ${book.title}`, 'success');
            this.loadBooks(this.bookSearch()); 
          },
          error: (e) => {
            const msg = e.error?.message || 'Failed to delete book';
            this.toastService.error(msg);
            this.addActivity(`Failed to delete book: ${book.title} (${msg})`, 'error');
          }
        });
      }
    });
  }


  generateBookId() {
    this.bookService.generateUniqueId().subscribe({
      next: (r: any) => this.form.patchValue({ book_id: r.id }),
      error: () => this.toastService.error('Failed to generate unique ID')
    });
  }

  generateIsbn() {
    this.bookService.generateUniqueIsbn().subscribe({
      next: (r: any) => this.form.patchValue({ isbn: r.isbn }),
      error: () => this.toastService.error('Failed to generate unique ISBN')
    });
  }

  clearForm() {
    this.form.reset({ price: null, quantity: null } as any);
    this.selectedCover = null;
    this.isEditing.set(false);
    this.selectedBookId = '';
  }



  onCsvSelected(e: any) {
    const file = e.target.files[0]; if (!file) return;
    this.isImporting.set(true); this.importResult.set(null);
    const fd = new FormData(); fd.append('csv', file);
    this.bookService.importBooks(fd).subscribe({
      next: (r) => { 
        this.importResult.set(r.results); 
        this.toastService.success(r.message); 
        this.addActivity(`Imported books from CSV`, 'success');
        this.loadBooks(); 
        this.isImporting.set(false); 
      },
      error: (e) => { 
        this.toastService.error(e.error?.message || 'Import failed'); 
        this.addActivity(`Failed to import CSV`, 'error');
        this.isImporting.set(false); 
      }
    });
    e.target.value = '';
  }

  closeImportResults() {
    this.importResult.set(null);
  }

  getBarcodeBase64(text: string): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
      background: 'transparent',
      lineColor: '#000000'
    });
    return canvas.toDataURL('image/png');
  }

  loadBookCopies(book_id: string) {
    this.bookService.getBookCopies(book_id).subscribe({
      next: (r) => {
        const copies = (r.data || []).map((c: any) => ({
          ...c,
          barcodeBase64: this.getBarcodeBase64(c.copy_id)
        }));
        this.selectedBookCopies.set(copies);
      },
      error: () => this.toastService.error('Failed to load copies')
    });
  }

  viewCopies(book: Book) {
    this.selectedBookId = book.book_id;
    this.isViewingCopies.set(true);
    this.loadBookCopies(book.book_id);
  }

  async printBarcode(book: Book) {
    this.toastService.info(`Generating barcodes for ${book.title}... please wait.`);
    this.bookService.getBookCopies(book.book_id).subscribe({
      next: (r) => {
        try {
          const copies = r.data;
          if (!copies || copies.length === 0) {
            this.toastService.error('No copies found to print.');
            return;
          }

          const pdf = new jsPDF('l', 'mm', [50.8, 25.4]);
          
          for (let i = 0; i < copies.length; i++) {
            const copy = copies[i];
            
            if (!copy.copy_id) {
              console.warn('Missing copy_id for copy:', copy);
              continue;
            }

            // Create canvas and append it to body temporarily (required by some versions of JsBarcode)
            const canvas = document.createElement('canvas');
            canvas.style.display = 'none';
            document.body.appendChild(canvas);

            try {
              // 1. Generate Barcode
              JsBarcode(canvas, copy.copy_id.toString(), { 
                format: 'CODE128', 
                width: 2, 
                height: 40, 
                displayValue: true, 
                fontSize: 14,
                margin: 0 
              });

              if (i > 0) pdf.addPage([50.8, 25.4], 'l');
              
              // 2. Set White Background
              pdf.setFillColor(255, 255, 255);
              pdf.rect(0, 0, 50.8, 25.4, 'F');
              
              // 3. Draw Header Text
              pdf.setTextColor(0, 0, 0);
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'bold');
              pdf.text('LMS Library', 25.4, 5, { align: 'center' });
              
              pdf.setFontSize(7);
              pdf.setFont('helvetica', 'normal');
              const titleSafe = book.title || 'Unknown Title';
              const shortTitle = titleSafe.length > 30 ? titleSafe.substring(0, 27) + '...' : titleSafe;
              pdf.text(shortTitle, 25.4, 9, { align: 'center' });
              
              // 4. Add Barcode Image
              const barcodeData = canvas.toDataURL('image/png');
              pdf.addImage(barcodeData, 'PNG', 5.4, 11, 40, 13);
            } catch (err) {
              console.error('Error generating barcode for copy:', copy.copy_id, err);
            } finally {
              // Clean up DOM
              document.body.removeChild(canvas);
            }
          }
          
          pdf.save(`Barcodes_${book.book_id.replace(/\s+/g, '_')}.pdf`);
          this.toastService.success('Barcodes downloaded successfully!');
        } catch (err: any) {
          console.error('PDF Generation Error:', err);
          this.toastService.error('Failed to generate PDF: ' + err.message);
        }
      },
      error: (e) => {
        console.error('Failed to fetch copies:', e);
        this.toastService.error('Failed to load book copies for barcode generation.');
      }
    });
  }

  closeCopies() {
    this.isViewingCopies.set(false);
    this.selectedBookCopies.set([]);
  }

  viewDetails(book: Book) {
    this.selectedBook.set(book);
    this.isViewingDetails.set(true);
    this.copyPage.set(1);
    
    // Fetch History
    this.bookService.getBookHistory(book.book_id).subscribe({
      next: (r) => this.bookHistory.set(r.data),
      error: () => this.toastService.error('Failed to load book history')
    });

    // Fetch All Copies
    this.bookService.getBookCopies(book.book_id).subscribe({
      next: (r) => {
        const copies = (r.data || []).map((c: any) => ({
          ...c,
          barcodeBase64: this.getBarcodeBase64(c.copy_id)
        }));
        this.selectedBookCopies.set(copies);
      },
      error: () => this.toastService.error('Failed to load book copies')
    });
  }

  paginationArray = computed(() => {
    const p = this.pagination();
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

  getPaginatedCopies() {
    const start = (this.copyPage() - 1) * 12;
    return this.selectedBookCopies().slice(start, start + 12);
  }

  getCopyTotalPages() {
    return Math.ceil(this.selectedBookCopies().length / 12) || 1;
  }

  copyPaginationArray = computed(() => {
    const totalPages = this.getCopyTotalPages();
    const current = this.copyPage();
    
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

  nextCopyPage() {
    if (this.copyPage() < this.getCopyTotalPages()) this.copyPage.update(p => p + 1);
  }

  prevCopyPage() {
    if (this.copyPage() > 1) this.copyPage.update(p => p - 1);
  }

  closeDetails() {
    this.isViewingDetails.set(false);
    this.selectedBook.set(null);
    this.bookHistory.set([]);
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  setCopyPage(p: number) {
    this.copyPage.set(p);
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
