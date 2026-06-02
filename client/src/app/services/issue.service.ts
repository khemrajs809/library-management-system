import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../models/issue.model';
import { API_BASE, ApiResponse } from '../core/api.config';

@Injectable({ providedIn: 'root' })
export class IssueService {
  private http = inject(HttpClient);

  getActiveIssues(): Observable<ApiResponse<Issue[]>> {
    return this.http.get<ApiResponse<Issue[]>>(`${API_BASE}/issues`);
  }

  getHistory(): Observable<ApiResponse<Issue[]>> {
    return this.http.get<ApiResponse<Issue[]>>(`${API_BASE}/issues/history`);
  }

  issueBook(memberId: string, bookId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues`, { memberId, bookId });
  }

  returnBook(issueId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/return`, { issueId });
  }

  renewBook(issueId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/renew`, { issueId });
  }

  markAsLost(issueId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/lost`, { issueId });
  }

  payFine(issueId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/${issueId}/pay-fine`, {});
  }

  returnByBookId(bookId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/return-by-book`, { bookId });
  }

  lookupIssueByBookId(bookId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_BASE}/issues/lookup/${bookId}`);
  }

  getFinesAndLost(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/issues/fines-and-lost`);
  }

  sendFineReminder(issueId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/${issueId}/send-reminder`, {});
  }
}
