import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';
import { Announcement } from '../models/announcement.model';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private http = inject(HttpClient);
  private publicUrl = `${API_BASE}/announcements`;
  private adminUrl = `${API_BASE}/admin/announcements`;

  public isVisible = signal<boolean>(false);

  // Public Methods
  getActiveAnnouncements(): Observable<{success: boolean, data: Announcement[]}> {
    return this.http.get<{success: boolean, data: Announcement[]}>(`${this.publicUrl}/active`);
  }

  trackView(id: number): Observable<any> {
    return this.http.post(`${this.publicUrl}/${id}/view`, {});
  }

  // Admin Methods
  getAllAnnouncements(): Observable<{success: boolean, data: Announcement[]}> {
    return this.http.get<{success: boolean, data: Announcement[]}>(this.adminUrl);
  }

  createAnnouncement(data: Partial<Announcement>): Observable<any> {
    return this.http.post(this.adminUrl, data);
  }

  toggleStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.adminUrl}/${id}/status`, { isActive: isActive });
  }

  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/${id}`);
  }
}
