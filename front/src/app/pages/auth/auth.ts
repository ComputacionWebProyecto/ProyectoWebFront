import { Component, OnInit } from '@angular/core';
import { LeftPanel } from './components/left-panel/left-panel';
import { RightPanel } from './components/right-panel/right-panel';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Registration } from '../../models/Registration';
import { LoginRequest } from '../../models/Login';
import { BackendUserResponse } from '../../models/BackendUserResponse';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [LeftPanel, RightPanel, RouterModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onRegisterSubmit(data: Registration) {
    this.authService.registrar(data).subscribe({
      next: (createdUser) => {
        console.log('Datos de registro', createdUser);
        this.authService.setUser(createdUser.user);
        this.router.navigate(['dashboard']);
      },
      error: (err) => {
        // El error ya es manejado por el interceptor
      }
    });
  }

  onLoginSubmit(credentials: LoginRequest) {
    console.log('Intentando login con credenciales:', credentials);
    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        this.authService.setUser(response.user);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.log('Error en login:', err);
        // El error ya es manejado por el interceptor
      }
    });
  }
}