import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../../shared/animations/spinner/spinner.component';

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: './book-details.component.html',
  styleUrl: './book-details.component.css'
})
export class BookDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookService = inject(BookService);
  private authService = inject(AuthService);
  private location = inject(Location);

  book = signal<any>(null);
  relatedBooks = signal<any[]>([]);
  issueHistory = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.fetchBookDetails(id);
      }
    });
  }

  fetchBookDetails(id: string) {
    this.isLoading.set(true);
    this.bookService.getBookById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.book.set(res.data);
          this.fetchRelatedBooks(id);
        } else {
          this.router.navigate(['/books']);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching book details:', err);
        this.router.navigate(['/books']);
        this.isLoading.set(false);
      }
    });
  }

  fetchRelatedBooks(id: string) {
    this.bookService.getRelatedBooks(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.relatedBooks.set(res.data || []);
        }
      },
      error: (err) => console.error('Error fetching related books:', err)
    });
  }

  goBack() {
    this.location.back();
  }
}
