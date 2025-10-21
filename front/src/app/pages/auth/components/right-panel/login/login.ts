import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../../../../models/Login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  credentials: LoginRequest = new LoginRequest('', '');

  @Output() loginData = new EventEmitter<LoginRequest>();

  constructor(private router: Router) { }

  submit() {
    this.loginData.emit(this.credentials);
  }

  navigateToRegister() {
    this.router.navigate(['/auth/registro']);
  }
}