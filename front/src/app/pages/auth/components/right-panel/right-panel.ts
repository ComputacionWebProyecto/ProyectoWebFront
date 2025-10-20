import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Register } from './register/register';
import { Login } from './login/login';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, Register, Login],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css'
})
export class RightPanel implements OnInit {

  isLoginRoute: boolean = false;

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

}