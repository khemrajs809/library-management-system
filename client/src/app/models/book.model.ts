export interface Book {
  bookId: string;
  isbn: string;
  title: string;
  author?: string;
  stream?: string;
  publicationYear?: number;
  price: number;
  quantity: number;
  available: number;
  totalCopies: number;
  availableCopies: number;
  coverUrl?: string;
  publisher?: string;
  edition?: string;
  shelfLocation?: string;
  createdAt?: string;
}
