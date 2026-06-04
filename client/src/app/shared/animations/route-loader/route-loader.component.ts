import { Component, Input } from '@angular/core';

import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * Full-screen route-transition loader overlay.
 * Shows when [visible]=true. Covers the whole viewport with a frosted
 * background and a centered spinner. Fades in/out via CSS.
 *
 * Usage:
 *   <app-route-loader [visible]="isRouteLoading()" />
 */
@Component({
  selector: 'app-route-loader',
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: './route-loader.component.html',
  styleUrl: './route-loader.component.css'
})
export class RouteLoaderComponent {
  @Input() visible = false;
}
