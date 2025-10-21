import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';
import { LoginRequest, LoginResponse } from '../../../../../models/Login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  credentials: LoginRequest = new LoginRequest('', '');

  constructor(private authService: AuthService, private router: Router) { }

  submit() {
    console.log('Intentando login con credenciales:', this.credentials);
    this.authService.login(this.credentials).subscribe({
      next: (response: LoginResponse) => {
        console.log('Respuesta del login:', response);
        console.log('Usuario autenticado:', response.user);
        this.authService.setUser(response.user);
        console.log('Usuario guardado en localStorage');
        this.router.navigate(['/dashboard']);
        console.log('Navegando a /dashboard');
      },
      error: (err) => {
        console.log('Error en login:', err);
        alert(err.error?.message || 'Error al iniciar sesión');
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/auth/registro']);
  }

}
