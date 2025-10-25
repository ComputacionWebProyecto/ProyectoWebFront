import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { GatewayService } from '../../services/gateway.service';
import { Gateway } from '../../models/Gateway';
import { ProcessPanel } from './process-panel/process-panel';
import { UserPanel } from './user-panel/user-panel';
import { RolePanel } from './role-panel/role-panel';

// === NUEVO: para el inspector lateral (coincide con el HTML)
import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';

interface BoardComponent {
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;

  // === NUEVO: soporte opcional para activities/edges (no afecta gateways)
  activityId?: number;
  edgeId?: number;
  fromId?: number;
  toId?: number;
  width?: number;   // para calcular el centro en edges
  height?: number;  // para calcular el centro en edges
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Mantengo todos los imports de dev y agrego ActivityPanel / EdgePanel para el inspector
  imports: [CommonModule, DropdownMenuComponent, HeaderDashboard, ProcessPanel, UserPanel, RolePanel, ActivityPanel, EdgePanel],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  isSidebarOpen = true;
  isProcessPanelOpen = false;
  isUserPanelOpen = false;
  isRolePanelOpen = false; // dev

  // === NUEVO: inspector lateral para Activity/Edge (usado en el HTML)
  inspectorOpen = false;
  inspectorKind: 'activity' | 'edge' | null = null;

  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  constructor(private gatewayService: GatewayService) {}

  ngOnInit(): void {
    // Cargar gateways existentes solo al iniciar (dev)
    this.loadGateways();
  }

  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        // Limpiar solo los gateways que vienen del backend para evitar duplicados (dev)
        this.boardComponents = [];

        gateways.forEach((gateway: Gateway) => {
          if (gateway.status === 'active' && gateway.id) {
            this.boardComponents.push({
              id: `gateway-${gateway.id}`,
              type: gateway.type,
              category: 'gateway',
              x: gateway.x || 100,
              y: gateway.y || 100,
              label: this.getComponentLabel(gateway.type),
              gatewayId: gateway.id
            });
          }
        });
        console.log('Gateways cargados desde backend:', this.boardComponents);
      },
      error: (error: any) => {
        console.error('Error al cargar gateways:', error);
      }
    });
  }

  onToggleRoles() {
    this.isRolePanelOpen = !this.isRolePanelOpen;
    if (this.isUserPanelOpen || this.isProcessPanelOpen) {
      this.isUserPanelOpen = false;
      this.isProcessPanelOpen = false;
    }
  }

  toggleProcessPanel() {
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
    if (this.isUserPanelOpen || this.isRolePanelOpen) {
      this.isUserPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }

  toggleUserPanel() {
    this.isUserPanelOpen = !this.isUserPanelOpen;
    if (this.isProcessPanelOpen || this.isRolePanelOpen) {
      this.isProcessPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    // Verificar si es un componente existente que se está moviendo (dev)
    const componentId = event.dataTransfer?.getData('component-id');

    if (componentId) {
      // MOVER componente existente (dev)
      const boardElement = event.currentTarget as HTMLElement;
      const rect = boardElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const component = this.boardComponents.find(c => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;
        console.log('Componente reposicionado:', component);

        // Si es un gateway, actualizar posición en el backend (dev)
        if (component.gatewayId && component.category === 'gateway') {
          this.updateGatewayPosition(component);
        }
      }
    } else {
      // AGREGAR nuevo componente desde el menú (dev)
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');

      if (componentType && componentCategory) {
        const boardElement = event.currentTarget as HTMLElement;
        const rect = boardElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.addComponentToBoard(componentType, componentCategory, x, y);

        // === NUEVO: abrir inspector si es Activity o Edge
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

  addComponentToBoard(type: string, category: string, x: number, y: number): void {
    console.log(' Agregando componente:', type, category, 'en posición:', x, y);

    // Crear ID temporal único (dev)
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // === NUEVO: si es 'activity', seteamos ancho/alto por defecto (para edge centers)
    const defaults =
      category === 'activity'
        ? { width: 100, height: 60 }
        : {};

    const newComponent: BoardComponent = {
      id: tempId,
      type: type,
      category: category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type),
      ...defaults
    };

    // Render inmediato (dev)
    this.boardComponents.push(newComponent);
    console.log('Componente agregado visualmente:', newComponent);
    console.log('Total componentes en tablero:', this.boardComponents.length);

    // Si es un gateway, guardarlo en el backend (dev intacto)
    if (category === 'gateway') {
      const gateway: Gateway = {
        type: type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y
      };

      console.log('Enviando gateway al backend:', gateway);
      console.log('URL del backend:', 'http://localhost:8080/api/gateways');

      this.gatewayService.createGateway(gateway).subscribe({
        next: (savedGateway: Gateway) => {
          console.log('========================================');
          console.log('RESPUESTA DEL BACKEND RECIBIDA');
          console.log('========================================');
          console.log('Gateway guardado:', savedGateway);
          console.log('ID:', savedGateway.id);
          console.log('Tipo:', savedGateway.type);
          console.log('Status:', savedGateway.status);
          console.log('Posición X:', savedGateway.x);
          console.log('Posición Y:', savedGateway.y);
          console.log('========================================');

          // Actualizar el componente con el ID real del backend (dev)
          const component = this.boardComponents.find(c => c.id === tempId);
          if (component && savedGateway.id) {
            component.gatewayId = savedGateway.id;
            component.id = `gateway-${savedGateway.id}`;
            console.log('🔄 Componente actualizado con ID del backend:', component);
          } else {
            console.warn('No se pudo encontrar el componente temporal para actualizar');
          }
        },
        error: (error: any) => {
          console.log('========================================');
          console.error('ERROR AL GUARDAR EN BACKEND');
          console.log('========================================');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Mensaje:', error.message);
          console.error('URL:', error.url);

          if (error.error) {
            console.error('Detalles del error:', error.error);
          }
          console.log('========================================');

          // El componente ya está visible, solo logueamos el error (dev)
          console.log('El componente permanece visible localmente');
        }
      });
    }
  }

  updateGatewayPosition(component: BoardComponent): void {
    if (component.gatewayId) {
      const gateway: Gateway = {
        id: component.gatewayId,
        type: component.type,
        status: 'active',
        x: component.x,
        y: component.y
      };

      this.gatewayService.updateGateway(component.gatewayId, gateway).subscribe({
        next: () => {
          console.log('Posición actualizada en backend');
        },
        error: (error: any) => {
          console.error('Error al actualizar posición:', error);
        }
      });
    }
  }

  getComponentLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'decision-gateway': 'Decisión',
      'task-user': 'Tarea de Usuario',
      'event-start': 'Evento Inicio'
    };
    return labels[type] || 'Decisión';
  }

  onComponentSelected(data: { type: string, category: string }): void {
    console.log('Componente seleccionado desde el menú:', data);
    // Agregar en el centro del tablero cuando se hace clic (dev)
    this.addComponentToBoard(data.type, data.category, 400, 300);

    // === NUEVO: abrir inspector si aplica
    if (data.category === 'activity' || data.category === 'edge') {
      this.openInspector(data.category as 'activity' | 'edge');
    }
  }

  removeComponent(id: string): void {
    const component = this.boardComponents.find(c => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      this.gatewayService.deleteGateway(component.gatewayId).subscribe({
        next: () => {
          console.log('Gateway eliminado del backend');
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
          console.log('Componentes restantes:', this.boardComponents.length);
        },
        error: (error: any) => {
          console.error('Error al eliminar gateway:', error);
          // Eliminar localmente aunque falle (dev)
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        }
      });
    } else {
      this.boardComponents = this.boardComponents.filter(c => c.id !== id);
      console.log('Componente eliminado localmente:', id);
    }
  }

  onComponentDragStart(event: DragEvent, component: BoardComponent): void {
    // === NUEVO: los edges NO se arrastran
    if (component.category === 'edge') return;

    if (event.dataTransfer) {
      this.isDraggingExisting = true;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('component-id', component.id);

      const target = event.target as HTMLElement;
      target.classList.add('dragging');
      console.log('Iniciando drag de componente existente:', component.id);
    }
  }

  onComponentDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    this.isDraggingExisting = false;
    console.log('Drag finalizado');
  }

  // === NUEVO: Inspector lateral Activity/Edge
  openInspector(kind: 'activity' | 'edge'): void {
    this.inspectorKind = kind;
    this.inspectorOpen = true;
  }
  closeInspector(): void {
    this.inspectorOpen = false;
    this.inspectorKind = null;
  }

  // === NUEVO: cálculo de coordenadas para líneas de edges (usado por el HTML)
  edgeCoordsByComponent(edgeCmp: BoardComponent) {
    if (edgeCmp.category !== 'edge' || !edgeCmp.fromId || !edgeCmp.toId) return null;

    const from = this.boardComponents.find(c => c.category === 'activity' && c.activityId === edgeCmp.fromId);
    const to   = this.boardComponents.find(c => c.category === 'activity' && c.activityId === edgeCmp.toId);
    if (!from || !to) return null;

    const fromW = from.width ?? 100, fromH = from.height ?? 60;
    const toW   = to.width ?? 100,   toH   = to.height ?? 60;

    const x1 = from.x + fromW / 2;
    const y1 = from.y + fromH / 2;
    const x2 = to.x + toW / 2;
    const y2 = to.y + toH / 2;
    return { x1, y1, x2, y2 };
  }
}
