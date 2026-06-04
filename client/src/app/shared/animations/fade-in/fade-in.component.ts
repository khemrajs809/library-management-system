import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-fade-in',
  standalone: true,
  imports: [],
  templateUrl: './fade-in.component.html',
  styleUrls: ['./fade-in.component.css']
})
export class FadeInComponent {
  @Input() delay = 0;
}
