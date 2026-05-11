import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable spinning circle indicator.
 * Inputs:
 *   size   — diameter in px  (default: 40)
 *   color  — CSS color       (default: #ef4444, LMS red)
 *   thick  — border width px (default: 4)
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css'
})
export class SpinnerComponent {
  @Input() size  = 40;
  @Input() color = '#ef4444';
  @Input() thick = 4;
  @Input() label = 'Loading';

  @HostBinding('style.--spinner-size.px') get hostSize() { return this.size; }
  @HostBinding('style.--spinner-thick.px') get hostThick() { return this.thick; }
  
  // Color is handled via CSS variable --spinner-color. 
  // If the input is explicitly provided, we bind it to the host variable.
  @HostBinding('style.--spinner-color') get hostColor() { return this.color; }
}
