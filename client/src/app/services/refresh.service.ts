import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RefreshService {
  // Signal to trigger refresh in active components
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  // Global loading state for the refresh button
  isRefreshing = signal<boolean>(false);

  triggerRefresh() {
    if (this.isRefreshing()) return;
    
    this.isRefreshing.set(true);
    this.refreshSubject.next();
    
    // Auto-reset refreshing state after a timeout as a fallback
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 5000);
  }

  completeRefresh() {
    this.isRefreshing.set(false);
  }
}
