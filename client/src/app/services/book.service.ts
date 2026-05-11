import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book } from '../models/book.model';
import { API_BASE, ApiResponse } from '../core/api.config';

@Injectable({ providedIn: 'root' })
export class BookService {
  private http = inject(HttpClient);

  getBooks(q = '', page = 1, limit = 8): Observable<any> {
    let url = `${API_BASE}/books?page=${page}&limit=${limit}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return this.http.get<any>(url);
  }

  addBook(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/books`, formData);
  }

  updateBook(id: string, formData: FormData): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${API_BASE}/books/${id}`, formData);
  }

  deleteBook(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${API_BASE}/books/${id}`);
  }

  importBooks(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/books/import`, formData);
  }

  generateUniqueId(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_BASE}/books/generate-id`);
  }

  generateUniqueIsbn(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_BASE}/books/generate-isbn`);
  }

  getBookCopies(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/books/${id}/copies`);
  }

  getBookHistory(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/books/${id}/history`);
  }
}
