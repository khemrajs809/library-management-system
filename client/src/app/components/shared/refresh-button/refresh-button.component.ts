import { Component, inject } from '@angular/core';

import { RefreshService } from '../../../services/refresh.service';

@Component({
  selector: 'app-refresh-button',
  standalone: true,
  imports: [],
  templateUrl: './refresh-button.component.html',
  styleUrls: ['./refresh-button.component.css']
})
export class RefreshButtonComponent {
  refreshService = inject(RefreshService);

  onRefresh() {
    this.refreshService.triggerRefresh();
  }
}
