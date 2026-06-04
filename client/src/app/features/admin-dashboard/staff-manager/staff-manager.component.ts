import { Component, inject, signal, OnInit, OnDestroy, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { ModalService } from '../../../services/modal.service';
import { API_BASE } from '../../../core/api.config';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-staff-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './staff-manager.component.html',
  styleUrl: './staff-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffManagerComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  public refreshService = inject(RefreshService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  libForm: FormGroup;
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);
  loading = signal<boolean>(false);
  
  // Librarian Directory State
  librarians = signal<any[]>([]);
  fetchingData = signal<boolean>(true);
  editingLibId = signal<string | null>(null);
  passwordUpdateLoading = signal<boolean>(false);
  generatedId = signal<string | null>(null);

  ngOnInit() {
    this.loadLibrarians();
    this.checkAndGenerateId();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.refreshData();
    });
  }

  refreshData() {
    this.loadLibrarians();
    this.checkAndGenerateId();
    setTimeout(() => {
      this.refreshService.completeRefresh();
      this.cdr.markForCheck();
    }, 800);
  }

  ngOnDestroy() {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  private checkAndGenerateId() {
    if (!this.editingLibId() && !this.libForm.get('libId')?.value) {
      this.generateLibrarianId();
    }
  }

  constructor() {
    this.libForm = this.fb.group({
      libId: [null as string | null],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  loadLibrarians() {
    this.fetchingData.set(true);
    this.http.get<{success: boolean, data: any[]}>(`${API_BASE}/admin/librarians`).subscribe({
      next: (res) => {
        this.librarians.set(res.data);
        this.fetchingData.set(false);
      },
      error: (err: any) => {
        this.toast.error(err.error?.message || 'Failed to load librarians');
        this.fetchingData.set(false);
      }
    });
  }

  generateLibrarianId() {
    this.http.get<{success: boolean, id: string}>(`${API_BASE}/admin/librarians/generate-id`).subscribe({
      next: (res) => {
        this.generatedId.set(res.id);
        this.libForm.get('libId')?.setValue(res.id, { emitEvent: false });
        this.cdr.markForCheck();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to generate unique Librarian ID')
    });
  }

  onSubmit() {
    if (this.libForm.valid) {
      this.loading.set(true);
      this.message.set(null);

      this.http.post(`${API_BASE}/admin/librarians`, this.libForm.value)
        .subscribe({
          next: (res: any) => {
            this.message.set({ type: 'success', text: res.message });
            this.libForm.reset();
            this.generatedId.set(null);
            this.checkAndGenerateId(); // Fetch next ID
            this.loading.set(false);
            this.loadLibrarians(); // Refresh list
          },
          error: (err) => {
            this.message.set({ 
              type: 'error', 
              text: err.error.message || 'Failed to create librarian account' 
            });
            this.loading.set(false);
          }
        });
    }
  }

  clearForm() {
    this.libForm.reset();
    this.generatedId.set(null);
    this.checkAndGenerateId();
    this.message.set(null);
  }

  deleteLibrarian(id: string) {
    this.modal.confirm({
      title: 'Delete Account',
      message: `Are you sure you want to permanently delete librarian ${id}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        this.http.delete(`${API_BASE}/admin/librarians/${id}`).subscribe({
          next: (res: any) => {
            this.toast.success(res.message);
            this.loadLibrarians();
          },
          error: (err) => this.toast.error('Deletion failed')
        });
      }
    });
  }

  toggleEdit(libId: string | null) {
    this.editingLibId.set(libId);
  }

  onUpdatePassword(libId: string, newPass: string) {
    if (!newPass || newPass.length < 6) {
      this.toast.warning('Password must be at least 6 characters');
      return;
    }

    this.passwordUpdateLoading.set(true);
    this.http.put(`${API_BASE}/admin/librarians/${libId}/password`, { password: newPass }).subscribe({
      next: (res: any) => {
        this.toast.success(res.message);
        this.editingLibId.set(null);
        this.passwordUpdateLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error.message || 'Update failed');
        this.passwordUpdateLoading.set(false);
      }
    });
  }

  toggleStatus(libId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'Activate' : 'Deactivate';
    
    this.modal.confirm({
      title: `${actionText} Librarian`,
      message: `Are you sure you want to ${actionText.toLowerCase()} librarian ${libId}?`,
      confirmText: actionText,
      type: newStatus === 'active' ? 'info' : 'warning',
      onConfirm: () => {
        this.http.patch(`${API_BASE}/admin/librarians/${libId}/status`, { status: newStatus }).subscribe({
          next: (res: any) => {
            this.toast.success(res.message);
            this.loadLibrarians();
          },
          error: (err) => this.toast.error(err.error?.message || 'Status update failed')
        });
      }
    });
  }
}
