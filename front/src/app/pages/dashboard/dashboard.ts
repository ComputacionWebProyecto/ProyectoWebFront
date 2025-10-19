import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { GatewayService } from '../../services/gateway.service';
import { Gateway } from '../../models/Gateway';

interface BoardComponent {
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DropdownMenuComponent, HeaderDashboard],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  isSidebarOpen = true;
  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  constructor(private gatewayService: GatewayService) {}

  ngOnInit(): void {
    this.loadGateways();
  }

  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        this.boardComponents = gateways
          .filter((gateway: Gateway) => gateway.status === 'active' && gateway.id)
          .map((gateway: Gateway) => ({
            id: `gateway-${gateway.id}`,
            type: gateway.type || 'unknown',
            category: 'gateway',
            x: gateway.x ?? 100,
            y: gateway.y ?? 100,
            label: this.getComponentLabel(gateway.type || 'unknown'),
            gatewayId: gateway.id
          }));

        console.log('Gateways cargados:', this.boardComponents);
      },
      error: (error: any) => {
        console.error('Error al cargar gateways:', error);
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    const componentId = event.dataTransfer?.getData('component-id');
    const boardElement = event.currentTarget as HTMLElement;

    if (!boardElement || !event.clientX || !event.clientY) return;

    const rect = boardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (componentId) {
      // Mover componente existente
      const component = this.boardComponents.find(c => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;

        if (component.gatewayId && component.category === 'gateway') {
          this.updateGatewayPosition(component);
        }
      }
    } else {
      // Agregar nuevo componente
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');

      if (componentType && componentCategory) {
        this.addComponentToBoard(componentType, componentCategory, x, y);
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
    const newComponent: BoardComponent = {
      id: `component-${this.componentCounter++}`,
      type,
      category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type)
    };

    if (category === 'gateway') {
      const gateway: Gateway = {
        type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y
      };

      this.gatewayService.createGateway(gateway).subscribe({
        next: (savedGateway: Gateway) => {
          if (savedGateway?.id) {
            newComponent.gatewayId = savedGateway.id;
            newComponent.id = `gateway-${savedGateway.id}`;
          }
          this.boardComponents.push(newComponent);
          console.log('Gateway guardado:', savedGateway);
        },
        error: (error: any) => {
          console.error('Error al guardar gateway:', error);
          this.boardComponents.push(newComponent);
        }
      });
    } else {
      this.boardComponents.push(newComponent);
    }
  }

  updateGatewayPosition(component: BoardComponent): void {
    if (!component.gatewayId) return;

    const gateway: Gateway = {
      id: component.gatewayId,
      type: component.type,
      status: 'active',
      x: component.x,
      y: component.y
    };

    this.gatewayService.updateGateway(component.gatewayId, gateway).subscribe({
      next: () => {
        console.log('Posición de gateway actualizada');
      },
      error: (error: any) => {
        console.error('Error al actualizar posición:', error);
      }
    });
  }

  getComponentLabel(type: string): string {
    const labels: Record<string, string> = {
      'decision-gateway': 'Decisión',
      'parallel-gateway': 'Paralelo',
      'exclusive-gateway': 'Exclusivo',
      'task-user': 'Tarea de Usuario',
      'event-start': 'Evento Inicio'
    };
    return labels[type] || type;
  }

  onComponentSelected(data: { type: string; category: string }): void {
    this.addComponentToBoard(data.type, data.category, 400, 300);
  }

  removeComponent(id: string): void {
    const component = this.boardComponents.find(c => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      this.gatewayService.deleteGateway(component.gatewayId).subscribe({
        next: () => {
          console.log('Gateway eliminado');
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        },
        error: (error: any) => {
          console.error('Error al eliminar gateway:', error);
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        }
      });
    } else {
      this.boardComponents = this.boardComponents.filter(c => c.id !== id);
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
}
