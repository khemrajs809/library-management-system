import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { UPLOADS_BASE, API_BASE } from '../../../core/api.config';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-deleted-books',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deleted-books.html',
  styleUrl: './deleted-books.css'
})
export class DeletedBooksComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  deletedBooks = signal<any[]>([]);
  loading = signal(false);

  readonly uploadsBase = UPLOADS_BASE;

  ngOnInit() {
    this.loadDeletedBooks();
  }

  loadDeletedBooks() {
    this.loading.set(true);
    this.http.get<any>(`${API_BASE}/books/trash`).subscribe({
      next: (res) => {
        this.deletedBooks.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load deleted books');
        this.loading.set(false);
      }
    });
  }

  restoreBook(id: string) {
    this.http.post<any>(`${API_BASE}/books/${id}/restore`, {}).subscribe({
      next: (res) => {
        this.toastService.success(res.message);
        this.loadDeletedBooks();
      },
      error: (err) => this.toastService.error(err.error?.message || 'Failed to restore book')
    });
  }

  permanentDeleteBook(id: string) {
    this.modalService.confirm({
      title: 'Permanent Deletion',
      message: 'Are you sure you want to permanently delete this book? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Permanently',
      onConfirm: () => {
        this.http.delete<any>(`${API_BASE}/books/${id}/permanent`).subscribe({
          next: (res) => {
            this.toastService.success(res.message);
            this.loadDeletedBooks();
          },
          error: (err) => this.toastService.error(err.error?.message || 'Failed to permanently delete book')
        });
      }
    });
  }
}
