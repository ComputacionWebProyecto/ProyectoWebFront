// src/app/pages/dashboard/drop-menu/drop-menu.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { ActiveProcessService } from '../../../services/active-process.service';

type Category = 'gateway' | 'activity' | 'edge';

@Component({
  selector: 'app-drop-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-menu.html',
  styleUrls: ['./drop-menu.css'],
})
export class DropdownMenuComponent {
  @Input() isOpen = true;

  /** Emite el tipo y la categoría para que el Dashboard cree el componente */
  @Output() componentSelected = new EventEmitter<{ type: string; category: Category }>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private activeProcessService: ActiveProcessService
  ) {}

  // Estado de submenús
  isGatewayOpen = false;
  isTasksOpen = false;
  isEventsOpen = false;

  // Toggles
  toggleGateway() { this.isGatewayOpen = !this.isGatewayOpen; }
  toggleTasks()   { this.isTasksOpen = !this.isTasksOpen; }
  toggleEvents()  { this.isEventsOpen = !this.isEventsOpen; }

  logout() {
    this.authService.logout();
    this.router.navigate(['auth/login']);
  }

  /** Inicio de drag desde el menú (DnD hacia el tablero) */
  onDragStart(event: DragEvent, componentType: string, category: Category) {
    // Para EDGE: NO permitir drag (evita "pelotica" y altas visuales)
    if (category === 'edge') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Validar que haya un proceso activo antes de permitir drag de gateway/activity
    if ((category === 'gateway' || category === 'activity') && !this.activeProcessService.hasActiveProcess()) {
      event.preventDefault();
      alert('⚠️ Debes crear y seleccionar un proceso antes de agregar elementos al tablero.\n\nUsa "My Processes" en el menú superior.');
      return;
    }

    if (!event.dataTransfer) return;

    event.dataTransfer.effectAllowed = 'copy';
    // Claves que espera el Dashboard.onBoardDrop
    event.dataTransfer.setData('component-type', componentType);
    event.dataTransfer.setData('component-category', category);

    // Útil si quieres inspeccionar en devtools
    event.dataTransfer.setData(
      'component',
      JSON.stringify({
        type: componentType,
        category,
        label: this.getLabel(componentType, category),
      }),
    );

    const el = event.target as HTMLElement | null;
    el?.classList.add('opacity-50');
  }

  onDragEnd(event: DragEvent) {
    const el = event.target as HTMLElement | null;
    el?.classList.remove('opacity-50');
  }

  /** Click directo para añadir sin arrastrar */
  onSelectComponent(componentType: string, category: Category) {
    // Validar que haya un proceso activo antes de permitir selección de gateway/activity
    if ((category === 'gateway' || category === 'activity') && !this.activeProcessService.hasActiveProcess()) {
      alert('⚠️ Debes crear y seleccionar un proceso antes de agregar elementos al tablero.\n\nUsa "My Processes" en el menú superior.');
      return;
    }

    // Para EDGE, el Dashboard solo abre el panel (sin insertar nodo)
    this.componentSelected.emit({ type: componentType, category });
  }

  // Etiquetas bonitas para el preview del menú (opcional)
  private getLabel(type: string, category: Category): string {
    if (category === 'gateway') {
      const map: Record<string, string> = {
        'decision-gateway': 'Decisión',
        'parallel-gateway': 'Paralelo',
        'exclusive-gateway': 'Exclusivo',
      };
      return map[type] ?? 'Gateway';
    }
    if (category === 'activity') {
      const map: Record<string, string> = {
        'task-user': 'Tarea de Usuario',
      };
      return map[type] ?? 'Actividad';
    }
    if (category === 'edge') {
      const map: Record<string, string> = {
        'edge-line': 'Edge (conectar)',
        'event-start': 'Evento Inicio',
      };
      return map[type] ?? 'Edge';
    }
    return 'Componente';
  }
}
