import { Component, OnInit, OnDestroy, signal } from '@angular/core';


@Component({
  selector: 'app-carousel-3d',
  standalone: true,
  imports: [],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css'
})
export class Carousel3DComponent implements OnInit, OnDestroy {
  currentAngle = signal(0);
  private interval: any;

  cells = [
    { id: 1, title: 'INVENTORY', icon: '📚', color: '#EE5253', bg: '#FFF0F0' },
    { id: 2, title: 'MEMBERS', icon: '👥', color: '#4834D4', bg: '#F0F4FF' },
    { id: 3, title: 'RETURNS', icon: '♻️', color: '#20BF6B', bg: '#F0FFF4' },
    { id: 4, title: 'DIGITAL', icon: '💻', color: '#F0932B', bg: '#FFFBF0' },
    { id: 5, title: 'FINES', icon: '💰', color: '#EB4D4B', bg: '#FFF1F1' },
    { id: 6, title: 'REPORTS', icon: '📊', color: '#22A6B3', bg: '#F0FDFA' }
  ];

  ngOnInit() {
    this.interval = setInterval(() => {
      this.rotateNext();
    }, 3000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  rotateNext() {
    this.currentAngle.update(angle => angle - 60);
  }
}
