import { Component, inject, signal, OnInit, OnDestroy, NgZone } from '@angular/core';

import { AnnouncementService } from '../../../services/announcement.service';
import { Announcement } from '../../../models/announcement.model';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-announcement-bar',
  standalone: true,
  imports: [],
  templateUrl: './top-announcement-bar.html',
  styleUrl: './top-announcement-bar.css'
})
export class TopAnnouncementBarComponent implements OnInit, OnDestroy {
  private announcementService = inject(AnnouncementService);
  private refreshService = inject(RefreshService);
  private ngZone = inject(NgZone);
  private refreshSub?: Subscription;

  announcements = signal<Announcement[]>([]);
  isVisible = this.announcementService.isVisible;
  currentIndex = signal<number>(0);
  pauseAnimation = false;

  getIcon(type?: string): string {
    const icons: any = {
      'info': '📢',
      'success': '✨',
      'warning': '🔔',
      'error': '🚨',
      'emergency': '🆘',
      'maintenance': '🛠️',
      'holiday': '🎈',
      'event': '🎫',
      'update': '🚀',
      'system': '⚙️',
      'arrival': '📚',
      'hours': '⏰',
      'policy': '📜',
      'staff': '⭐'
    };
    return type ? (icons[type] || '📢') : '📢';
  }

  ngOnInit() {
    this.fetchAnnouncements();
    
    // Listen for global refreshes to update announcements too
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.fetchAnnouncements();
    });
  }

  fetchAnnouncements() {
    this.announcementService.getActiveAnnouncements().subscribe({
      next: (res: any) => {
        // Use timeout and ngZone to avoid NG0100 errors during view initialization
        setTimeout(() => {
          this.ngZone.run(() => {
            this.announcements.set(res.data);
            this.isVisible.set(res.data.length > 0);
          });
        }, 0);

        if (res.data.length > 0) {
          this.trackView(res.data[0].id!);
        }
      },
      error: () => {
        setTimeout(() => {
          this.ngZone.run(() => this.isVisible.set(false));
        }, 0);
      }
    });
  }

  trackView(id: number) {
    this.announcementService.trackView(id).subscribe();
  }

  close() {
    this.isVisible.set(false);
  }

  ngOnDestroy() {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }
}
