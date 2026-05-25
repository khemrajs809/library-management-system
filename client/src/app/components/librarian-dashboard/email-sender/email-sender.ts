import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { API_BASE } from '../../../core/api.config';

@Component({
  selector: 'app-email-sender',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './email-sender.html',
  styleUrl: './email-sender.css'
})
export class EmailSenderComponent {
  @Input() email: string | null = null;
  @Output() close = new EventEmitter<void>();

  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  subject = signal<string>('');
  message = signal<string>('');
  isSending = signal<boolean>(false);

  closeModal() {
    this.close.emit();
  }

  sendEmail() {
    if (!this.subject() || !this.message()) {
      this.toastService.error('Please enter a subject and message.');
      return;
    }

    this.isSending.set(true);

    this.http.post(`${API_BASE}/members/send-email`, {
      to: this.email,
      subject: this.subject(),
      message: this.message()
    }).subscribe({
      next: () => {
        this.toastService.success(`Email successfully sent to ${this.email}`);
        this.isSending.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to send email');
        this.isSending.set(false);
      }
    });
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
