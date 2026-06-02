import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Book } from '../../../../../models/book.model';
import { BookService } from '../../../../../services/book.service';
import { ToastService } from '../../../../../services/toast.service';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './book-form.html',
  styleUrl: './book-form.css'
})
export class BookFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private bookService = inject(BookService);
  private toastService = inject(ToastService);

  @Input() isEditing = false;
  @Input() initialData: Book | null = null;

  @Output() onSave = new EventEmitter<FormData>();
  @Output() onCancel = new EventEmitter<void>();

  selectedCover: File | null = null;

  form = this.fb.group({
    bookId:          [null as string | null],
    isbn:             [null as string | null],
    title:            ['', Validators.required],
    author:           ['', Validators.required],
    stream:           ['', Validators.required],
    publicationYear: ['', Validators.required],
    publisher:        ['', Validators.required],
    edition:          ['', Validators.required],
    shelfLocation:   ['', Validators.required],
    price:            [null as any, [Validators.required, Validators.min(0)]],
    quantity:         [null as any, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() {
    this.form.valueChanges.subscribe(val => {
      const hasValue = !!(val.title || val.author || val.stream || val.publicationYear || val.publisher || val.edition || val.shelfLocation || val.price || val.quantity || val.isbn);
      if (hasValue && !this.isEditing && !this.form.get('bookId')?.value) {
        this.generateIds();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData'] && this.initialData && this.isEditing) {
      this.populateForm(this.initialData);
    }
  }

  private generateIds() {
    this.bookService.generateUniqueId().subscribe({
      next: (r: any) => this.form.patchValue({ bookId: r.id }),
      error: () => this.toastService.error('Failed to generate Book ID')
    });
  }

  populateForm(book: Book) {
    this.form.patchValue({
      bookId: book.bookId,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      stream: book.stream,
      publicationYear: book.publicationYear as any,
      publisher: book.publisher,
      edition: book.edition,
      shelfLocation: book.shelfLocation,
      price: book.price,
      quantity: book.quantity
    });
    this.form.get('bookId')?.disable();
  }

  onCoverSelected(e: any) {
    if (e.target.files[0]) this.selectedCover = e.target.files[0];
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('bookId', v.bookId ?? '');
    fd.append('isbn',    v.isbn    ?? '');
    fd.append('title',   v.title   ?? '');
    fd.append('price',   String(v.price ?? 0));
    fd.append('quantity', String(v.quantity ?? 1));
    if (v.author) fd.append('author', v.author);
    if (v.stream) fd.append('stream', v.stream);
    if (v.publicationYear) fd.append('publicationYear', String(v.publicationYear));
    if (v.publisher) fd.append('publisher', v.publisher);
    if (v.edition) fd.append('edition', v.edition);
    if (v.shelfLocation) fd.append('shelfLocation', v.shelfLocation);
    if (this.selectedCover) fd.append('cover', this.selectedCover);

    this.onSave.emit(fd);
  }

  reset() {
    this.form.reset();
    this.form.get('bookId')?.enable();
    this.selectedCover = null;
    this.onCancel.emit();
  }
}
