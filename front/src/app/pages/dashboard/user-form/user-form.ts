import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { User } from '../../../models/User';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { BackendRoleResponse } from '../../../models/BackendRoleResponse';

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
  roles: BackendRoleResponse[] = [];

  user: User = new User('', '', '');

  constructor(private roleService: RoleService, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadRoles();
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
