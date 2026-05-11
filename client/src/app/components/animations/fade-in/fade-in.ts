import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Fade-in wrapper. Any content placed inside will animate in
 * when the component is rendered.
 *
 * Usage:
 *   <app-fade-in [delay]="200">
 *     <div>content fades in after 200ms</div>
 *   </app-fade-in>
 */
@Component({
  selector: 'app-fade-in',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fade-in.html',
  styleUrl: './fade-in.css'
})
export class FadeInComponent {
  @Input() delay    = 0;
  /** Duration of the fade animation in ms */
  @Input() duration = 450;

  @HostBinding('style.--fade-delay.ms') get hostDelay() { return this.delay; }
  @HostBinding('style.--fade-duration.ms') get hostDuration() { return this.duration; }
}
