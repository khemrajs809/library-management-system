import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE, ApiResponse } from '../core/api.config';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  constructor(private http: HttpClient) { }

  createReservation(memberId: string, bookId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${API_BASE}/reservations`, { member_id: memberId, book_id: bookId });
  }

  getWaitlistForBook(bookId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/reservations/book/${bookId}`);
  }

  getAllWaitlists(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/reservations`);
  }

  cancelReservation(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${API_BASE}/reservations/${id}`);
  }
}
