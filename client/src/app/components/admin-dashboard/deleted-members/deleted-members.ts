import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { UPLOADS_BASE, API_BASE } from '../../../core/api.config';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-deleted-members',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deleted-members.html',
  styleUrl: './deleted-members.css'
})
export class DeletedMembersComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  deletedMembers = signal<any[]>([]);
  loading = signal(false);

  readonly uploadsBase = UPLOADS_BASE;

  ngOnInit() {
    this.loadDeletedMembers();
  }

  loadDeletedMembers() {
    this.loading.set(true);
    this.http.get<any>(`${API_BASE}/members/trash`).subscribe({
      next: (res) => {
        this.deletedMembers.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load deleted members');
        this.loading.set(false);
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
