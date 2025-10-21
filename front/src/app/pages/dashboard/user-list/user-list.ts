import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BackendUserSafeResponse } from '../../../models/BackendUserSafeResponse';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css'
})
export class UserList {
  @Input() users: BackendUserSafeResponse[] = [];
  @Output() onDelete = new EventEmitter<number>();

}
