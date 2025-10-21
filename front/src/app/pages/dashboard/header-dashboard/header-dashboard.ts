import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-dashboard.html',
  styleUrls: ['./header-dashboard.css']
})
export class HeaderDashboard {
  @Input() isSidebarOpen = true;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleProcesses = new EventEmitter<void>();
  // 👉 NUEVO: evento para abrir/cerrar el panel de Roles
  @Output() toggleRoles = new EventEmitter<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleProcessPanel() { 
    this.toggleProcesses.emit();
  }

  // 👉 NUEVO: handler para el botón "Roles"
  toggleRolesPanel() {
    this.toggleRoles.emit();
  }
}
