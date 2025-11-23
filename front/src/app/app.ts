import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('front');

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Iniciar renovación automática de token si el usuario está logueado
    if (this.authService.isLoggedIn()) {
      // Validar token al iniciar la app
      this.authService.validateToken().subscribe({
        next: (isValid) => {
          if (isValid) {
            // Token válido, iniciar renovación automática
            this.authService.startTokenRenewal();
          } else {
            // Token inválido, hacer logout
            console.warn('Token inválido al iniciar, redirigiendo a login');
            this.authService.logout();
          }
        },
        error: (err) => {
          console.error('Error validando token:', err);
          this.authService.logout();
        }
      });
    }
  }
}
