export interface Book {
  book_id: string;
  isbn: string;
  title: string;
  author?: string;
  stream?: string;
  publication_year?: number;
  price: number;
  quantity: number;
  available: number;
  total_copies: number;
  available_copies: number;
  cover_url?: string;
  publisher?: string;
  edition?: string;
  shelf_location?: string;
  created_at?: string;
}
