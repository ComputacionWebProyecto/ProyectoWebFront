import { Component, OnInit } from '@angular/core';
import { Company } from '../../../../../models/Company';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../../models/User';
import { AuthService } from '../../../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register{

  company: Company = new Company(0, '', '');
  user: User = new User('','','');

  constructor(private authService: AuthService){}

  submit() {
    console.log('Datos empresa:', this.company);
    console.log('Datos usuario:', this.user);
    this.authService.registrar(this.company, this.user).subscribe({
      next: res => console.log('Registro de empresa completado', res),
      error: err => console.log('Registro fallido', err)
    });


  }


}
