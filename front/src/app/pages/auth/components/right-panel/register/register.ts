import { Component, OnInit } from '@angular/core';
import { Company } from '../../../../../models/Company';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../../models/User';
import { AuthService } from '../../../../../services/auth.service';
import { CommonModule } from '@angular/common';
//import { Router } from '@angular/router';
import { Router, RouterLink } from '@angular/router';
import { Registration } from '../../../../../models/Registration';

@Component({
  selector: 'app-register',
  standalone: true,
  //imports: [FormsModule, CommonModule],
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  company: Company = new Company(0, '', '');
  user: User = new User('', '', '');

  constructor(private authService: AuthService, private router: Router) { }

  submit() {
    const registrationData = new Registration(this.company, this.user);

    this.authService.registrar(registrationData).subscribe({
      next: (createdUser) => {
        console.log('Datos de registro', createdUser);
        this.authService.setUser(createdUser);
        this.router.navigate(['dashboard']);
      },
      error: (err) => {
        alert(err.error?.message || 'Error desconocido');
      }
    });
  }



}
