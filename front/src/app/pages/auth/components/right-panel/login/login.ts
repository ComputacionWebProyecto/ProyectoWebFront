import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../../models/User';
import { AuthService } from '../../../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  user: User = new User('', '', '');

  constructor(private authService: AuthService, private router: Router) { }

  submit() {
    this.authService.login(this.user).subscribe({
      next: (loggedUser) => {
        console.log('Usuario autenticado', loggedUser);
        this.authService.setUser(loggedUser);
        this.router.navigate(['dashboard']);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al iniciar sesión');
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/auth/registro']);
  }

}