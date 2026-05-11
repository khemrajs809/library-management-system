import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Member, MemberProfile } from '../models/member.model';
import { API_BASE, ApiResponse } from '../core/api.config';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);

  getMembers(q = '', page = 1, limit = 10): Observable<any> {
    let url = `${API_BASE}/members?page=${page}&limit=${limit}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return this.http.get<any>(url);
  }

  getMember(id: string): Observable<ApiResponse<Member>> {
    return this.http.get<ApiResponse<Member>>(`${API_BASE}/members/${id}`);
  }

  getMemberProfile(id: string): Observable<ApiResponse<MemberProfile>> {
    return this.http.get<ApiResponse<MemberProfile>>(`${API_BASE}/members/${id}/profile`);
  }

  addMember(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/members`, formData);
  }

  updateMember(id: string, formData: FormData): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${API_BASE}/members/${id}`, formData);
  }

  deleteMember(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${API_BASE}/members/${id}`);
  }

  importMembers(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_BASE}/members/import`, formData);
  }

  generateUniqueId(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_BASE}/members/generate-id`);
  }

  getRecentActivities(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API_BASE}/members/activities/recent`);
  }
}
