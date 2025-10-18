import { Component, OnInit } from '@angular/core';
import { Company } from '../../../../../models/Company';
import { CompanyService } from '../../../../../services/company.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register{

  company: Company = new Company(0, '', '');



  submit() {
    


  }


}
