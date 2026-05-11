import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Book } from '../../../../../models/book.model';
import { BookService } from '../../../../../services/book.service';
import { ToastService } from '../../../../../services/toast.service';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  ngOnInit() {
    this.form.valueChanges.subscribe(val => {
      const hasValue = !!(val.title || val.author || val.stream || val.publication_year || val.publisher || val.edition || val.shelf_location || val.price || val.quantity || val.isbn);
      if (hasValue && !this.isEditing && !this.form.get('book_id')?.value) {
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
      next: (r: any) => this.form.patchValue({ book_id: r.id }),
      error: () => this.toastService.error('Failed to generate Book ID')
    });
  }

  populateForm(book: Book) {
    this.form.patchValue({
      book_id: book.book_id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      stream: book.stream,
      publication_year: book.publication_year as any,
      publisher: book.publisher,
      edition: book.edition,
      shelf_location: book.shelf_location,
      price: book.price,
      quantity: book.quantity
    });
    this.form.get('book_id')?.disable();
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
    fd.append('book_id', v.book_id ?? '');
    fd.append('isbn',    v.isbn    ?? '');
    fd.append('title',   v.title   ?? '');
    fd.append('price',   String(v.price ?? 0));
    fd.append('quantity', String(v.quantity ?? 1));
    if (v.author) fd.append('author', v.author);
    if (v.stream) fd.append('stream', v.stream);
    if (v.publication_year) fd.append('publication_year', String(v.publication_year));
    if (v.publisher) fd.append('publisher', v.publisher);
    if (v.edition) fd.append('edition', v.edition);
    if (v.shelf_location) fd.append('shelf_location', v.shelf_location);
    if (this.selectedCover) fd.append('cover', this.selectedCover);

    this.onSave.emit(fd);
  }

  reset() {
    this.form.reset();
    this.form.get('book_id')?.enable();
    this.selectedCover = null;
    this.onCancel.emit();
  }
}
