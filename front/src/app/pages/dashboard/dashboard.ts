import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { GatewayService } from '../../services/gateway.service';
import { Gateway } from '../../models/Gateway';
import { ProcessPanel } from './process-panel/process-panel';
import { UserPanel } from './user-panel/user-panel';

import { RolePanel } from './role-panel/role-panel'; // NUEVO

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
  imports: [CommonModule, DropdownMenuComponent, HeaderDashboard, ProcessPanel, UserPanel,RolePanel],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  isSidebarOpen = true;
  isProcessPanelOpen = false;
  isUserPanelOpen = false;
  isRolePanelOpen = false; // NUEVO

  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  constructor(private gatewayService: GatewayService) {}

  ngOnInit(): void {
    // Cargar gateways existentes solo al iniciar
    this.loadGateways();
  }

  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        // Limpiar solo los gateways que vienen del backend para evitar duplicados
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

  // NUEVO: se llama desde (toggleRoles) del header
  onToggleRoles(): void {
    // si no quieres dos paneles abiertos a la vez, cierra el de procesos:
    // this.isProcessPanelOpen = false;
    this.isRolePanelOpen = !this.isRolePanelOpen;
  }

  toggleProcessPanel() { 
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
    if(this.isUserPanelOpen){
      this.isUserPanelOpen = false;
    }
  }
  toggleUserPanel(){
    this.isUserPanelOpen = !this.isUserPanelOpen;
    if(this.isProcessPanelOpen){
      this.isProcessPanelOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onBoardDrop(event: DragEvent): void {
    event.preventDefault();
    
    // Verificar si es un componente existente que se está moviendo
    const componentId = event.dataTransfer?.getData('component-id');
    
    if (componentId) {
      // MOVER componente existente
      const boardElement = event.currentTarget as HTMLElement;
      const rect = boardElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const component = this.boardComponents.find(c => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;
        console.log('Componente reposicionado:', component);
        
        // Si es un gateway, actualizar posición en el backend
        if (component.gatewayId && component.category === 'gateway') {
          this.updateGatewayPosition(component);
        }
      }
    } else {
      // AGREGAR nuevo componente desde el menú
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');
      
      if (componentType && componentCategory) {
        const boardElement = event.currentTarget as HTMLElement;
        const rect = boardElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
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
  console.log(' Agregando componente:', type, category, 'en posición:', x, y);
  
  // Crear ID temporal único
  const tempId = `temp-${Date.now()}-${Math.random()}`;
  
  const newComponent: BoardComponent = {
    id: tempId,
    type: type,
    category: category,
    x: x - 30,
    y: y - 30,
    label: this.getComponentLabel(type)
  };
  

  this.boardComponents.push(newComponent);
  console.log('Componente agregado visualmente:', newComponent);
  console.log('Total componentes en tablero:', this.boardComponents.length);
  
  // Si es un gateway, guardarlo en el backend
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
        
        // Actualizar el componente con el ID real del backend
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
        
        // El componente ya está visible, solo logueamos el error
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

  onComponentSelected(data: {type: string, category: string}): void {
    console.log('Componente seleccionado desde el menú:', data);
    // Agregar en el centro del tablero cuando se hace clic
    this.addComponentToBoard(data.type, data.category, 400, 300);
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
          // Eliminar localmente aunque falle
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        }
      });
    } else {
      this.boardComponents = this.boardComponents.filter(c => c.id !== id);
      console.log('Componente eliminado localmente:', id);
    }
  }

  onComponentDragStart(event: DragEvent, component: BoardComponent): void {
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
}