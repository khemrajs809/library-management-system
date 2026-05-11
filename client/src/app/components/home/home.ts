import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FadeInComponent } from '../animations/fade-in/fade-in';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FadeInComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  buttonText = 'Get Started';

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.userRole();
      if (role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/librarian/dashboard']);
      }
      return;
    }

    setTimeout(() => {
      this.buttonText = 'Login';
    }, 1000);
  }
}
