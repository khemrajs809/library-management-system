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

  issueBook(member_id: string, book_id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues`, { member_id, book_id });
  }

  returnBook(issue_id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/return`, { issue_id });
  }

  renewBook(issue_id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/renew`, { issue_id });
  }

  markAsLost(issue_id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/lost`, { issue_id });
  }

  payFine(issue_id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/${issue_id}/pay-fine`, {});
  }

  returnByBookId(book_id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/return-by-book`, { book_id });
  }

  lookupIssueByBookId(book_id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_BASE}/issues/lookup/${book_id}`);
  }

  getFinesAndLost(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/issues/fines-and-lost`);
  }

  sendFineReminder(issue_id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/issues/${issue_id}/send-reminder`, {});
  }
}
