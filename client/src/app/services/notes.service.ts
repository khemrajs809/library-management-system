import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export interface NotesResponse {
  success: boolean;
  notes?: {
    englishDetails: Array<{ title: string, desc: string }>;
    hinglishDetails: Array<{ title: string, desc: string }>;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE}/notes`;

  getNotes(): Observable<NotesResponse> {
    return this.http.get<NotesResponse>(this.apiUrl);
  }

  verifyPattern(pattern: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/verify`, { pattern });
  }
}
