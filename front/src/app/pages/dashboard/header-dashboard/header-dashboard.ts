import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * HEADER DASHBOARD COMPONENT
 *
 * Barra superior del dashboard que muestra el logo, navegación y el proceso activo.
 *
 * INDICADOR DE PROCESO ACTIVO:
 * Muestra el nombre del proceso en el que el usuario está trabajando actualmente,
 * resolviendo el problema de que los usuarios solo veían IDs numéricos.
 */
@Component({
  selector: 'app-header-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-dashboard.html',
  styleUrls: ['./header-dashboard.css']
})
export class HeaderDashboard {
  @Input() isSidebarOpen = true;

  /**
   * Nombre del proceso activo actual.
   *
   * PROPÓSITO:
   * Mostrar al usuario en qué proceso está trabajando mediante texto legible.
   *
   * EJEMPLO:
   * "Trabajando en: Proceso de Aprobación de Compras"
   *
   * VALOR:
   * - string: nombre del proceso activo
   * - null: no hay proceso activo (muestra mensaje "Selecciona un proceso")
   */
  @Input() currentProcessName: string | null = null;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleProcesses = new EventEmitter<void>();
  @Output() toggleUsers = new EventEmitter<void>();
  @Output() toggleRoles = new EventEmitter<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleProcessPanel() {
    this.toggleProcesses.emit();
  }

  toggleUserPanel(){
    this.toggleUsers.emit();
  }
  toggleRolesPanel() {
    this.toggleRoles.emit();
  }
}

