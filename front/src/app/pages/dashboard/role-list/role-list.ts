import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Role } from '../../../models/Role';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css'
})
export class RoleList {
  @Input() roles: Role[] = [];
  @Output() onEdit = new EventEmitter<Role>();
  @Output() onDelete = new EventEmitter<number>();
}
