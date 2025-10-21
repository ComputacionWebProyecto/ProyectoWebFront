import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Register } from './register/register';
import { Login } from './login/login';
import { Registration } from '../../../../models/Registration';
import { LoginRequest } from '../../../../models/Login';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, Register, Login],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css'
})
export class RightPanel implements OnInit {

  isLoginRoute: boolean = false;
  @Output() registerData = new EventEmitter<Registration>();
  @Output() loginData = new EventEmitter<LoginRequest>();

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    // Escuchar cambios en el parámetro 'mode'
    this.route.params.subscribe(params => {
      const mode = params['mode'];
      console.log('Modo detectado:', mode);
      this.isLoginRoute = mode === 'login';
      console.log('¿Mostrar login?', this.isLoginRoute);
    });
  }

  onRegister(data: Registration) {
    this.registerData.emit(data);
  }

  onLogin(credentials: LoginRequest) {
    this.loginData.emit(credentials);
  }
}