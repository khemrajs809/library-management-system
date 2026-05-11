import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner/spinner';

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
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './route-loader.html',
  styleUrl: './route-loader.css'
})
export class RouteLoaderComponent {
  @Input() visible = false;
}
