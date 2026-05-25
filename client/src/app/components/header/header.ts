import { Component } from '@angular/core';

import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-header',
  imports: [NavbarComponent],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {

}
