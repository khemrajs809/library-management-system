import { Component, Input } from '@angular/core';

import { SpinnerComponent } from '../spinner/spinner';

/**
 * Inline skeleton / content-placeholder loader.
 * Use inside a card or table while data is being fetched.
 * Shows a spinner + optional message when [loading]=true,
 * then reveals the projected content via ng-content.
 *
 * Usage:
 *   <app-skeleton-loader [loading]="isLoading()" message="Fetching books...">
 *     <div>actual content here</div>
 *   </app-skeleton-loader>
 */
@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: './skeleton-loader.html',
  styleUrl: './skeleton-loader.css'
})
export class SkeletonLoaderComponent {
  @Input() loading = false;
  @Input() message = '';
  /** Width of each shimmer row. Override to customise. */
  @Input() rows: string[] = ['100%', '85%', '70%', '90%', '60%'];
}
