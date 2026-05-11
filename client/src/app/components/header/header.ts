import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-header',
  imports: [CommonModule, NavbarComponent],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {

}
