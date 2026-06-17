import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ANIMATION_COMPONENTS } from '../../shared/animations/animations';
import { ParticleAnimationComponent } from '../../shared/components/particle-animation/particle-animation.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, ...ANIMATION_COMPONENTS, ParticleAnimationComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  buttonText = 'Get Started';

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.userRole();
      setTimeout(() => {
        if (role === 'admin') {
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
        } else {
          this.router.navigate(['/librarian/dashboard'], { replaceUrl: true });
        }
      }, 100);
      return;
    }

    setTimeout(() => {
      this.buttonText = 'Login';
    }, 1000);
  }

}
