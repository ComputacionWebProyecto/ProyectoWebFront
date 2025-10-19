import { Injectable } from '@angular/core';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { CompanyService } from './company.service';
import { ProcessService } from './process.service';
import { RoleService } from './role.service';
import { UserService } from './user.service';
import { Observable, switchMap } from 'rxjs';
import { Role } from '../models/Role';
import { Process } from '../models/Process';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  role: Role = new Role('administrador','usuario administrador total de la compañia');
  process: Process = new Process('Proceso inicial', 'Primer proceso de la compañia');

  constructor(
    private companyService: CompanyService,
    private processService: ProcessService,
    private roleService: RoleService,
    private userService: UserService
  ){

  }

  registrar(company: Company, user: User): Observable<User> {
    //crear la compañia
    return this.companyService.createCompany(company).pipe(
      switchMap(createdCompany => {
        //crear proceso
        this.process.companyId = createdCompany.id;
        return this.processService.createProcess(this.process).pipe(
          switchMap(createdProcess =>{
            //crear rol admin
            this.role.companyId = createdCompany.id;
            console.log('Datos role:', this.role);
            return this.roleService.createRole(this.role).pipe(
              switchMap(createdRole => {
                //crear usuario admin
                user.companyId = createdCompany.id;
                user.roleId = createdRole.id;
                return this.userService.createUser(user);
              })
            )
          })
        )
      })
    );
  }
}
