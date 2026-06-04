import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { UPLOADS_BASE, API_BASE } from '../../../core/api.config';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-archive-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archive-manager.component.html',
  styleUrl: './archive-manager.component.css'
})
export class ArchiveManagerComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  @Input() activeTab = 'archive';

  deletedBooks = signal<any[]>([]);
  deletedMembers = signal<any[]>([]);
  
  readonly uploadsBase = UPLOADS_BASE;

  ngOnInit() {
    this.loadDeletedBooks();
    this.loadDeletedMembers();
  }

  loadDeletedBooks() {
    this.http.get<any>(`${API_BASE}/books/trash`).subscribe({
      next: (res) => this.deletedBooks.set(res.data),
      error: () => this.toastService.error('Failed to load deleted books')
    });
  }

  loadDeletedMembers() {
    this.http.get<any>(`${API_BASE}/members/trash`).subscribe({
      next: (res) => this.deletedMembers.set(res.data),
      error: () => this.toastService.error('Failed to load deleted members')
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

  restoreMember(id: string) {
    this.http.post<any>(`${API_BASE}/members/${id}/restore`, {}).subscribe({
      next: (res) => {
        this.toastService.success(res.message);
        this.loadDeletedMembers();
      },
      error: (err) => this.toastService.error(err.error?.message || 'Failed to restore member')
    });
  }

  permanentDeleteMember(id: string) {
    this.modalService.confirm({
      title: 'Permanent Deletion',
      message: 'Are you sure you want to permanently delete this member? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Permanently',
      onConfirm: () => {
        this.http.delete<any>(`${API_BASE}/members/${id}/permanent`).subscribe({
          next: (res) => {
            this.toastService.success(res.message);
            this.loadDeletedMembers();
          },
          error: (err) => this.toastService.error(err.error?.message || 'Failed to permanently delete member')
        });
      }
    });
  }
}
