import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE}/admin`;

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }

  getOverviewStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/overview-stats`);
  }

  getLibrarians(): Observable<any> {
    return this.http.get(`${this.baseUrl}/librarians`);
  }

  importBooks(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import-books`, formData);
  }

  importMembers(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import-members`, formData);
  }
}
