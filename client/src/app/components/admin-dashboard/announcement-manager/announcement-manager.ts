import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AnnouncementService } from '../../../services/announcement.service';
import { Announcement } from '../../../models/announcement.model';
import { ToastService } from '../../../services/toast.service';
import { ModalService } from '../../../services/modal.service';
import { RefreshService } from '../../../services/refresh.service';

@Component({
  selector: 'app-announcement-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './announcement-manager.html',
  styleUrl: './announcement-manager.css'
})
export class AnnouncementManagerComponent implements OnInit {
  private announcementService = inject(AnnouncementService);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private fb = inject(FormBuilder);
  private refreshService = inject(RefreshService);

  announcements = signal<Announcement[]>([]);
  isLoading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  annForm: FormGroup;

  constructor() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.annForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      message: ['', [Validators.required]],
      type: ['info'],
      priority: ['medium'],
      is_active: [true],
      scroll_speed: [25],
      background_color: ['#b91c1c'],
      text_color: ['#ffffff'],
      show_icon: [true],
      show_close_button: [true],
      pause_on_hover: [true]
    });
  }

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.isLoading.set(true);
    this.announcementService.getAllAnnouncements().subscribe({
      next: (res) => {
        this.announcements.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
  }

  applyPreset(bg: string, text: string) {
    this.annForm.patchValue({
      background_color: bg,
      text_color: text
    });
  }

  onSubmit() {
    if (this.annForm.invalid) return;

    this.isLoading.set(true);
    const formData = { ...this.annForm.value };
    
    // Automate scheduling since manual pickers are removed
    // start_time = Now, end_time = Far Future (2099)
    const now = new Date();
    const farFuture = new Date('2099-12-31T23:59:59');

    formData.start_time = now.toISOString().slice(0, 19).replace('T', ' ');
    formData.end_time = farFuture.toISOString().slice(0, 19).replace('T', ' ');

    // Ensure border_color is set (default to background_color if missing)
    if (!formData.border_color) {
        formData.border_color = formData.background_color;
    }

    this.announcementService.createAnnouncement(formData).subscribe({
      next: (res) => {
        this.toast.success('Announcement published successfully');
        this.annForm.reset({
            type: 'info',
            priority: 'medium',
            scroll_speed: 25,
            background_color: '#b91c1c',
            text_color: '#ffffff',
            show_icon: true,
            show_close_button: true,
            pause_on_hover: true
        });
        this.showForm.set(false);
        this.loadAnnouncements();
        this.refreshService.triggerRefresh(); // Sync marquee instantly
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to publish');
        this.isLoading.set(false);
      }
    });
  }

  toggleStatus(id: number, currentStatus: boolean) {
    this.announcementService.toggleStatus(id, !currentStatus).subscribe({
      next: () => {
        this.loadAnnouncements();
        this.refreshService.triggerRefresh();
      }
    });
  }

  deleteAnnouncement(id: number) {
    this.modal.confirm({
      title: 'Delete Announcement',
      message: 'Are you sure you want to permanently remove this broadcast?',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        this.announcementService.deleteAnnouncement(id).subscribe({
          next: () => {
            this.toast.success('Announcement removed');
            this.loadAnnouncements();
            this.refreshService.triggerRefresh();
          }
        });
      }
    });
  }
}
