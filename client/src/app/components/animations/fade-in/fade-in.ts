import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fade-in',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in-container" [style.animation-delay]="delay + 'ms'">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .fade-in-container {
      animation: fadeIn 0.5s ease-in-out forwards;
      width: 100%;
      opacity: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FadeInComponent {
  @Input() delay = 0;
}
