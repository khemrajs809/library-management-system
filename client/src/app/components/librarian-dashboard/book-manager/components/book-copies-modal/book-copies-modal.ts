import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-book-copies-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-copies-modal.html',
  styleUrl: './book-copies-modal.css'
})
export class BookCopiesModalComponent {
  @Input() isOpen = false;
  @Input() copies: any[] = [];
  @Input() bookId: string | null = null;

  @Output() onClose = new EventEmitter<void>();

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
