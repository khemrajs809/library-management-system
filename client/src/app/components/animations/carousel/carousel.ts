import { Component, OnInit, OnDestroy, signal, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carousel-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.html',
  styleUrl: './carousel.css'
})
export class Carousel3DComponent implements OnInit, OnDestroy {
  currentAngle = signal<number>(0);
  private timer: any = null;

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentAngle.update(angle => angle - 60);
    }, 2500);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  @HostBinding('style.--carousel-transform') get carouselTransform() {
    return `translateZ(-200px) rotateY(${this.currentAngle()}deg)`;
  }
}
