import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-clock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-clock.component.html',
  styleUrl: './custom-clock.component.css'
})
export class CustomClockComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('hoursContainer') hoursContainer!: ElementRef;
  @ViewChild('minutesContainer') minutesContainer!: ElementRef;
  @ViewChild('secondsContainer') secondsContainer!: ElementRef;
  
  private lastTime = new Date();
  private timer: any;
  
  initHours = '00';
  initMinutes = '00';
  initSeconds = '00';
  amPm = 'AM';

  ngOnInit() {
    const now = new Date();
    this.lastTime = now;
    const { hours12, ampm } = this.get12HourFormat(now.getHours());
    this.initHours = this.formatNumber(hours12);
    this.initMinutes = this.formatNumber(now.getMinutes());
    this.initSeconds = this.formatNumber(now.getSeconds());
    this.amPm = ampm;
  }

  ngAfterViewInit() {
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private get12HourFormat(hours24: number) {
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    hours12 = hours12 ? hours12 : 12;
    return { hours12, ampm };
  }

  private updateTime() {
    const now = new Date();
    
    const curr = this.get12HourFormat(now.getHours());
    const last = this.get12HourFormat(this.lastTime.getHours());

    const currHoursStr = this.formatNumber(curr.hours12);
    const lastHoursStr = this.formatNumber(last.hours12);
    
    if (currHoursStr !== lastHoursStr) {
      this.updateContainer(this.hoursContainer.nativeElement, currHoursStr);
    }
    
    if (curr.ampm !== last.ampm) {
      this.amPm = curr.ampm;
    }
    
    const currMinutes = this.formatNumber(now.getMinutes());
    const lastMinutes = this.formatNumber(this.lastTime.getMinutes());
    if (currMinutes !== lastMinutes) {
      this.updateContainer(this.minutesContainer.nativeElement, currMinutes);
    }
    
    const currSeconds = this.formatNumber(now.getSeconds());
    const lastSeconds = this.formatNumber(this.lastTime.getSeconds());
    if (currSeconds !== lastSeconds) {
      this.updateContainer(this.secondsContainer.nativeElement, currSeconds);
    }
    
    this.lastTime = now;
  }

  private formatNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  private updateContainer(container: HTMLElement, newTime: string) {
    const time = newTime.split('');
    
    const first = container.children[0] as HTMLElement;
    if (first.lastElementChild && first.lastElementChild.textContent !== time[0]) {
      this.updateNumber(first, time[0]);
    }
    
    const second = container.children[1] as HTMLElement;
    if (second.lastElementChild && second.lastElementChild.textContent !== time[1]) {
      this.updateNumber(second, time[1]);
    }
  }

  private updateNumber(element: HTMLElement, number: string) {
    const second = element.lastElementChild?.cloneNode(true) as HTMLElement;
    if (!second) return;
    second.textContent = number;
    
    element.appendChild(second);
    element.classList.add('move');

    setTimeout(() => {
      element.classList.remove('move');
    }, 600); 
    setTimeout(() => {
      if (element.firstElementChild && element.children.length > 1) {
        element.removeChild(element.firstElementChild);
      }
    }, 600);
  }
}
