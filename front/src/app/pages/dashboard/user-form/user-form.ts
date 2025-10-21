import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { User } from '../../../models/User';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { BackendRoleResponse } from '../../../models/BackendRoleResponse';
import { BackendUserSafeResponse } from '../../../models/BackendUserSafeResponse';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css'
})
export class UserForm implements OnInit {
  @Output() onSave = new EventEmitter<User>();
  @Output() onCancel = new EventEmitter<void>();
  @Input() userData: BackendUserSafeResponse | null = null;

  roles: BackendRoleResponse[] = [];

  user: User = new User('', '', '');

  constructor(private roleService: RoleService, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userData'] && this.userData) {
      this.user = {
        id: this.userData.id,
        nombre: this.userData.nombre,
        correo: this.userData.correo,
        contrasena: '', 
        roleId: this.userData.role.id ?? undefined
      };
    }
  }

  loadRoles(): void {
    const userCurr = this.authService.getUser();
    const companyId = userCurr?.company.id;
    if (typeof companyId === "number") {
      this.roleService.getRolesByCompanyId(companyId).subscribe({
        next: (data: BackendRoleResponse[]) => this.roles = data,
        error: (err) => console.error('Error cargando roles', err)
      });

    }
  }

  save() {
    this.onSave.emit(this.user);
  }
  cancel() {
    this.onCancel.emit();
  }
}
