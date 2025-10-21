import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/User';
import { UserForm } from "../user-form/user-form";
import { UserList } from "../user-list/user-list";
import { BackendUserSafeResponse } from '../../../models/BackendUserSafeResponse';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-panel',
  standalone: true,
  imports: [UserForm, UserList, CommonModule],
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css'
})
export class UserPanel implements OnInit {

  @Input() isOpen = false;
  users: BackendUserSafeResponse[] = [];
  isCreating = false;

  constructor(private userService: UserService, private authService: AuthService, private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    const user = this.authService.getUser();
    console.log("datos usuario: ", user);
    const companyId = user?.company?.id;
    const currUserId = user?.id;
    if (typeof companyId === 'number' && typeof currUserId === 'number') {
      this.userService.getUsersByCompanyId(companyId, currUserId).subscribe({
        next: (data: BackendUserSafeResponse[]) => {
          this.users = [...data];
          this.cdr.detectChanges();
        },
        error: (err) => console.log("Error loading users: ", err)
      });
    }
  }

  openCreateForm() {
    this.isCreating = true;
  }

  closePanel() {
    this.isOpen = false;
  }

  cancelCreate() {
    this.isCreating = false;
  }

  saveUser(user: User) {
    const userAuth = this.authService.getUser();
    user.companyId = userAuth?.company.id;
    this.userService.createUser(user).subscribe({
      next: () => {
        this.isCreating = false;
        this.loadUsers();
      },
      error: (err) => console.log('Error creating user: ', err)
    });
  }

  deleteUser(userId: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        console.log('Usuario eliminado con éxito');
        // actualiza la lista sin recargar
        this.loadUsers();
        console.log('Lista actualizada con éxito');
      },
      error: (err) => console.log('Error eliminando usuario: ', err)
    });
  }


}
