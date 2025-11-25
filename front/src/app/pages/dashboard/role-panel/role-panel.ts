import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../../services/role.service';
import { Role } from '../../../models/Role';
import { RoleList } from '../role-list/role-list';
import { RoleForm } from '../role-form/role-form';
import { AuthService } from '../../../services/auth.service';
import { BackendUserResponse } from '@/app/models/BackendUserResponse';

@Component({
  selector: 'app-role-panel',
  standalone: true,
  imports: [CommonModule, RoleList, RoleForm],
  templateUrl: './role-panel.html',
  styleUrl: './role-panel.css'
})
export class RolePanel implements OnInit {
  @Input() isOpen = true;

  roles: Role[] = [];
  isCreating = false;
  current: Role = new Role('', '');

  mode: 'none' | 'edit' | 'delete' | 'consult' = 'none';
  constructor(private roleService: RoleService, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    const user = this.authService.getUser();
    if (user?.company.id !== undefined) {
      this.roleService.getRolesByCompanyId(user.company.id).subscribe({
        next: (data: Role[]) => {
          this.roles = data;
          console.log('Roles cargados:', data.length);
        },
        error: (err: any) => console.error('Error loading roles', err)
      });
    } else {
      console.error('No company id found for user');
    }
  }

  openCreateForm() {
    this.isCreating = true;
    this.current = new Role('', '');
  }

  startEdit(role: Role) {
    this.isCreating = true;
    this.current = new Role(role.nombre, role.descripcion, role.companyId, role.id);
  }

  closePanel() {
    this.isOpen = false;
  }

  cancelCreate() {
    this.isCreating = false;
  }

  saveRole(role: Role) {
    const user = this.authService.getUser();
    role.companyId = user?.company.id;

    const request$ = role.id
      ? this.roleService.updateRole(role.id, role)
      : this.roleService.createRole(role);

    request$.subscribe({
      next: () => {
        this.isCreating = false;
        this.loadRoles();
      },
      error: (err) => console.error('Error saving role', err)
    });
  }

  deleteRole(roleId: number) {
    if (!confirm('¿Eliminar (inactivar) este rol?')) return;

    this.roleService.deleteRole(roleId).subscribe({
      next: () => this.loadRoles(),
      error: (err) => {
        alert('No se puede eliminar: el rol está en uso o el servidor lo rechazó.');
        console.error('Error deleting role', err);
      }
    });
  }
  enterEditMode() {
    this.mode = this.mode === 'edit' ? 'none' : 'edit';
  }
  enterDeleteMode() {
    this.mode = this.mode === 'delete' ? 'none' : 'delete';
  }
  enterConsultMode() {
    this.mode = this.mode === 'consult' ? 'none' : 'consult';
  }



}
