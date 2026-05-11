import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  isDarkMode = signal(false);
  isNightMode = signal(false);

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.body.classList.add('dark-theme');
    }
    
    const savedNight = localStorage.getItem('nightMode');
    if (savedNight === 'true') {
      this.isNightMode.set(true);
      document.body.classList.add('night-mode');
    }
  }

  toggleDarkMode() {
    this.isDarkMode.update(v => !v);
    if (this.isDarkMode()) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleNightMode() {
    this.isNightMode.update(v => !v);
    if (this.isNightMode()) {
      document.body.classList.add('night-mode');
      localStorage.setItem('nightMode', 'true');
    } else {
      document.body.classList.remove('night-mode');
      localStorage.setItem('nightMode', 'false');
    }
  }
}
