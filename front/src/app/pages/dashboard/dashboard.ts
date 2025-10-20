// dashboard.ts (unificado: respeta la lógica de tu compañera y añade tus paneles)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownMenuComponent } from './drop-menu/drop-menu';
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { ProcessPanel } from './process-panel/process-panel';
import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';

import { GatewayService } from '../../services/gateway.service';
import { Gateway } from '../../models/Gateway';

interface BoardComponent {
  id: string;
  type: string;
  category: string; // 'gateway' | 'activity' | 'edge'
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DropdownMenuComponent,
    HeaderDashboard,
    ProcessPanel,
    ActivityPanel,
    EdgePanel,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  isSidebarOpen = true;
  isProcessPanelOpen = false;

  //  Inspector lateral (para Activity / Edge)
  inspectorOpen = false;
  inspectorKind: 'activity' | 'edge' | null = null;

  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  constructor(private gatewayService: GatewayService) {}

  ngOnInit(): void {
    this.loadGateways();
  }

  // ======== Carga / persistencia de Gateways (tal cual de tu compañera) ========
  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        this.boardComponents = gateways
          .filter((g: Gateway) => g.status === 'active' && g.id)
          .map((g: Gateway) => ({
            id: `gateway-${g.id}`,
            type: g.type || 'unknown',
            category: 'gateway',
            x: g.x ?? 100,
            y: g.y ?? 100,
            label: this.getComponentLabel(g.type || 'unknown'),
            gatewayId: g.id!,
          }));

        console.log('Gateways cargados:', this.boardComponents);
      },
      error: (err: any) => console.error('Error al cargar gateways:', err),
    });
  }

  updateGatewayPosition(component: BoardComponent): void {
    if (!component.gatewayId) return;

    const gateway: Gateway = {
      id: component.gatewayId,
      type: component.type,
      status: 'active',
      x: component.x,
      y: component.y,
    };

    this.gatewayService.updateGateway(component.gatewayId, gateway).subscribe({
      next: () => console.log('Posición de gateway actualizada'),
      error: (err: any) => console.error('Error al actualizar posición:', err),
    });
  }

  // ======== UI ========
  toggleProcessPanel(): void {
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // ======== Drag & Drop en el tablero ========
  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    const componentId = event.dataTransfer?.getData('component-id');
    const boardElement = event.currentTarget as HTMLElement;
    if (!boardElement || !event.clientX || !event.clientY) return;

    const rect = boardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (componentId) {
      // Mover un componente existente
      const component = this.boardComponents.find((c) => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;

        if (component.gatewayId && component.category === 'gateway') {
          this.updateGatewayPosition(component);
        }
      }
    } else {
      // Agregar nuevo componente desde el menú
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');

      if (componentType && componentCategory) {
        this.addComponentToBoard(componentType, componentCategory, x, y);

        // abrimos el inspector si es Activity o Edge
        if (componentCategory === 'activity' || componentCategory === 'edge') {
          this.openInspector(componentCategory as 'activity' | 'edge');
        }
      }
    }

    this.isDraggingExisting = false;
  }

  onBoardDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.isDraggingExisting ? 'move' : 'copy';
    }
  }

  onComponentDragStart(event: DragEvent, component: BoardComponent): void {
    if (!event.dataTransfer) return;
    this.isDraggingExisting = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('component-id', component.id);

    const target = event.target as HTMLElement;
    target.classList.add('dragging');
  }

  onComponentDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    this.isDraggingExisting = false;
  }

  // ======== Alta de componentes en el board ========
  addComponentToBoard(type: string, category: string, x: number, y: number): void {
    const newComponent: BoardComponent = {
      id: `component-${this.componentCounter++}`,
      type,
      category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type),
    };

    if (category === 'gateway') {
      const gateway: Gateway = {
        type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y,
      };

      this.gatewayService.createGateway(gateway).subscribe({
        next: (saved: Gateway) => {
          if (saved?.id) {
            newComponent.gatewayId = saved.id;
            newComponent.id = `gateway-${saved.id}`;
          }
          this.boardComponents.push(newComponent);
          console.log('Gateway guardado:', saved);
        },
        error: (err: any) => {
          console.error('Error al guardar gateway:', err);
          this.boardComponents.push(newComponent); // fallback local
        },
      });
    } else {
      // Activity / Edge: por ahora solo en memoria
      this.boardComponents.push(newComponent);
    }
  }

  removeComponent(id: string): void {
    const component = this.boardComponents.find((c) => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      this.gatewayService.deleteGateway(component.gatewayId).subscribe({
        next: () => {
          console.log('Gateway eliminado');
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
        error: (err: any) => {
          console.error('Error al eliminar gateway:', err);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
      });
    } else {
      this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
    }
  }

  // ======== Menú lateral izquierdo ========
  onComponentSelected(data: { type: string; category: string }): void {
    // Mantener el comportamiento existente (agregar a tablero en una posición por defecto)
    this.addComponentToBoard(data.type, data.category, 400, 300);

    // Y abrir el inspector si aplica (Activity / Edge)
    if (data.category === 'activity' || data.category === 'edge') {
      this.openInspector(data.category as 'activity' | 'edge');
    }
  }

  // ======== Inspector lateral (tus paneles) ========
  openInspector(kind: 'activity' | 'edge'): void {
    this.inspectorKind = kind;
    this.inspectorOpen = true;
  }

  closeInspector(): void {
    this.inspectorOpen = false;
    this.inspectorKind = null;
  }

  // ======== Util ========
  getComponentLabel(type: string): string {
    const labels: Record<string, string> = {
      'decision-gateway': 'Decisión',
      'parallel-gateway': 'Paralelo',
      'exclusive-gateway': 'Exclusivo',
      'task-user': 'Tarea de Usuario',
      'event-start': 'Evento Inicio',
    };
    return labels[type] || type;
  }
}
