import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../../models/Role';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-form.html',
  styleUrl: './role-form.css'
})
export class RoleForm {
  @Input() role: Role = new Role('', '');
  @Output() onSave = new EventEmitter<Role>();
  @Output() onCancel = new EventEmitter<void>();

  save() { this.onSave.emit(this.role); }
  cancel() { this.onCancel.emit(); }
}
