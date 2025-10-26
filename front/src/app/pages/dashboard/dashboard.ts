// dashboard.ts — base dev + integración mínima Activity/Edge (sin tocar Gateways)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownMenuComponent } from "./drop-menu/drop-menu";
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { GatewayService } from '../../services/gateway.service';
import { Gateway } from '../../models/Gateway';
import { ProcessPanel } from './process-panel/process-panel';
import { UserPanel } from './user-panel/user-panel';
import { RolePanel } from './role-panel/role-panel';
import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';

import { Activity } from '../../models/Activity';
import { Edge } from '../../models/Edge';
import { ActivityService } from '../../services/activity.service';
import { EdgeService } from '../../services/edge.service';

interface BoardComponent {
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;

  // ids de entidades
  activityId?: number;
  edgeId?: number;

  // Para trazar edges y centrar activities
  fromId?: number;
  toId?: number;
  width?: number;
  height?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DropdownMenuComponent, HeaderDashboard, ProcessPanel, UserPanel, RolePanel, ActivityPanel, EdgePanel],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  isSidebarOpen = true;
  isProcessPanelOpen = false;
  isUserPanelOpen = false;
  isRolePanelOpen = false;

  // Inspector lateral (activity/edge)
  inspectorOpen = false;
  inspectorKind: 'activity' | 'edge' | null = null;

  // NUEVO: IDs seleccionados (para paneles)
  selectedActivityId: number | null = null;
  selectedEdgeId: number | null = null;

  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  // Capas/caché locales (no afectan gateways)
  private activitiesLayer: BoardComponent[] = [];
  private edgesLayer: BoardComponent[] = [];
  private activitiesCache: Activity[] = [];
  private edgesCache: Edge[] = [];

  // Seguimiento de ids ya vistos para detectar “nuevo creado”
  private seenActivityIds = new Set<number>();
  private seenEdgeIds = new Set<number>();

  constructor(
    private gatewayService: GatewayService,
    private activityService: ActivityService,
    private edgeService: EdgeService,
  ) {}

  // Mapa de etiquetas legibles para la UI
  getComponentLabel(type: string): string {
    const labels: Record<string, string> = {
      'decision-gateway': 'Decisión',
      'parallel-gateway': 'Paralelo',
      'exclusive-gateway': 'Exclusivo',
      'task-user': 'Tarea de Usuario',
      'event-start': 'Evento Inicio',
    };
    return labels[type] ?? type;
  }

  ngOnInit(): void {
    // Gateways (dev)
    this.loadGateways();
    // Streams Activity/Edge
    this.subscribeActivitiesStream();
    this.subscribeEdgesStream();
  }

  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        // Mantengo exactamente el comportamiento de dev
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
        // Sumar capas actuales Activity/Edge sin tocar gateways
        this.recomputeBoardIncludeCurrentGateways();
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

  // ======== Drag & Drop en el tablero ========
  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    const componentId = event.dataTransfer?.getData('component-id');

    if (componentId) {
      // MOVER existente (dev)
      const boardElement = event.currentTarget as HTMLElement;
      const rect = boardElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const component = this.boardComponents.find(c => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;

        if (component.gatewayId && component.category === 'gateway') {
          this.updateGatewayPosition(component);
        }

        // Si es Activity, reflejar en servicio in-memory
        if (component.category === 'activity' && component.activityId != null) {
          this.updateActivityPosition(component);
        }

        // Si es Edge, reflejar en la capa local para no "rebotar"
        if (component.category === 'edge' && component.edgeId != null) {
          this.edgesLayer = this.edgesLayer.map(c =>
            c.id === component.id ? { ...c, x: component.x, y: component.y } : c
          );
        }

        // refrescar mezcla
        this.recomputeBoardAfterLocalMove(component);
      }
    } else {
      // AGREGAR nuevo desde el menú (dev)
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');

      if (componentType && componentCategory) {
        const boardElement = event.currentTarget as HTMLElement;
        const rect = boardElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.addComponentToBoard(componentType, componentCategory, x, y);

        // Abrir inspector al crear Activity/Edge por DnD
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
    if (event.dataTransfer) {
      this.isDraggingExisting = true;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('component-id', component.id);

      const target = event.target as HTMLElement;
      target.classList.add('dragging');
      console.log('Iniciando drag de componente existente:', component.id);

      // Seleccionar al empezar a mover (para abrir/mostrar panel correcto)
      if (component.category === 'activity') {
        this.selectedActivityId = component.activityId ?? null;
        this.inspectorKind = 'activity';
        this.inspectorOpen = true;
      } else if (component.category === 'edge') {
        this.selectedEdgeId = component.edgeId ?? null;
        this.inspectorKind = 'edge';
        this.inspectorOpen = true;
      }
    }
  }

  onComponentDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    this.isDraggingExisting = false;
    console.log('Drag finalizado');
  }

  // ======== Alta de componentes ========
  addComponentToBoard(type: string, category: string, x: number, y: number): void {
    console.log(' Agregando componente:', type, category, 'en posición:', x, y);

    // ID temporal (dev)
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const newComponent: BoardComponent = {
      id: tempId,
      type: type,
      category: category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type)
    };

    // Visual inmediato (dev)
    this.boardComponents.push(newComponent);
    console.log('Componente agregado visualmente:', newComponent);

    if (category === 'gateway') {
      // === Mantener tal cual dev ===
      const gateway: Gateway = {
        type: type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y
      };

      this.gatewayService.createGateway(gateway).subscribe({
        next: (savedGateway: Gateway) => {
          const component = this.boardComponents.find(c => c.id === tempId);
          if (component && savedGateway.id) {
            component.gatewayId = savedGateway.id;
            component.id = `gateway-${savedGateway.id}`;
            console.log('🔄 Componente actualizado con ID del backend:', component);
          }
        },
        error: (error: any) => {
          console.error('ERROR AL GUARDAR EN BACKEND', error);
          console.log('El componente permanece visible localmente');
        }
      });
      return;
    }

    // === Alta in-memory para activity / edge (NO forzar recompute aquí) ===
    if (category === 'activity') {
      const a: Activity = {
        name: 'Activity',
        description: '',
        x: newComponent.x,
        y: newComponent.y,
        width: 100,
        height: 60,
        status: 'active'
      };
      const svc: any = this.activityService as any;
      if (typeof svc.create === 'function')      svc.create(a);
      else if (typeof svc.add === 'function')    svc.add(a);
      else if (typeof svc.new === 'function')    svc.new(a);
      else console.warn('[Dashboard] ActivityService no expone create/add/new');
      return;
    }

    if (category === 'edge') {
      const e: Edge = { label: 'Edge', status: 'active' };
      const svc: any = this.edgeService as any;
      if (typeof svc.create === 'function')      svc.create(e);
      else if (typeof svc.add === 'function')    svc.add(e);
      else if (typeof svc.new === 'function')    svc.new(e);
      else console.warn('[Dashboard] EdgeService no expone create/add/new');
      return;
    }
  }

  // ======== Persistencia gateways ========
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
        next: () => console.log('Posición actualizada en backend'),
        error: (error: any) => console.error('Error al actualizar posición:', error)
      });
    }
  }

  // ======== Menú lateral ========
  onComponentSelected(data: { type: string, category: string }): void {
    console.log('Componente seleccionado desde el menú:', data);
    this.addComponentToBoard(data.type, data.category, 400, 300);

    // Abrir inspector al crear desde click
    if (data.category === 'activity' || data.category === 'edge') {
      this.openInspector(data.category as 'activity' | 'edge');
    }
  }

  // ======== Eliminar ========
  removeComponent(id: string): void {
    const component = this.boardComponents.find(c => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      // dev
      this.gatewayService.deleteGateway(component.gatewayId).subscribe({
        next: () => {
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        },
        error: (error: any) => {
          console.error('Error al eliminar gateway:', error);
          this.boardComponents = this.boardComponents.filter(c => c.id !== id);
        }
      });
      return;
    }

    // reflejar eliminación en servicios in-memory si tenemos IDs
    if (component?.category === 'activity' && component.activityId != null) {
      const svc: any = this.activityService as any;
      if (typeof svc.delete === 'function')      svc.delete(component.activityId);
      else if (typeof svc.remove === 'function') svc.remove(component.activityId);
      else console.warn('[Dashboard] ActivityService no expone delete/remove');
    } else if (component?.category === 'edge' && component.edgeId != null) {
      const svc: any = this.edgeService as any;
      if (typeof svc.delete === 'function')      svc.delete(component.edgeId);
      else if (typeof svc.remove === 'function') svc.remove(component.edgeId);
      else console.warn('[Dashboard] EdgeService no expone delete/remove');
    }

    // eliminación visual (dev)
    this.boardComponents = this.boardComponents.filter(c => c.id !== id);
  }

  // --- Inspector ---
  openInspector(kind: 'activity' | 'edge', component?: BoardComponent): void {
    this.inspectorKind = kind;
    this.inspectorOpen = true;

    // Si pasamos el componente (lo haremos al hacer click más adelante), fija la selección
    if (component) {
      if (kind === 'activity') this.selectedActivityId = component.activityId ?? null;
      if (kind === 'edge')     this.selectedEdgeId = component.edgeId ?? null;
    }
  }

  closeInspector(): void {
    this.inspectorOpen = false;
    this.inspectorKind = null;
    this.selectedActivityId = null;
    this.selectedEdgeId = null;
  }

  // ======== Líneas SVG (edges conectados) ========
  // Calcula las coordenadas de la línea de un edge. Si no hay from/to válidos, no dibuja (null).
  edgeCoordsByComponent(edgeCmp: BoardComponent): { x1: number; y1: number; x2: number; y2: number } | null {
    if (edgeCmp.category !== 'edge' || edgeCmp.fromId == null || edgeCmp.toId == null) return null;
    const from = this.boardComponents.find(c => c.category === 'activity' && (c as any).activityId === edgeCmp.fromId);
    const to   = this.boardComponents.find(c => c.category === 'activity' && (c as any).activityId === edgeCmp.toId);
    if (!from || !to) return null;
    const fromW = from.width ?? 100, fromH = from.height ?? 60;
    const toW   = to.width ?? 100,   toH   = to.height ?? 60;
    return { x1: from.x + fromW/2, y1: from.y + fromH/2, x2: to.x + toW/2, y2: to.y + toH/2 };
  }

  // ======== Streams tolerantes: Activities ========
  private subscribeActivitiesStream(): void {
    const svc: any = this.activityService as any;

    // Acepta múltiples convenciones: items$, list$, items.asObservable(), list(), getAll(), getActivities()
    const stream =
      svc.items$ ??
      svc.list$ ??
      (svc.items && typeof svc.items.asObservable === 'function' ? svc.items.asObservable() : undefined) ??
      (typeof svc.list === 'function' ? svc.list() : undefined) ??
      (typeof svc.getAll === 'function' ? svc.getAll() : undefined) ??
      (typeof svc.getActivities === 'function' ? svc.getActivities() : undefined);

    if (stream && typeof stream.subscribe === 'function') {
      stream.subscribe((acts: Activity[] = []) => {
        this.activitiesCache = acts ?? [];
        this.activitiesLayer = this.activitiesCache.map((a) => ({
          id: `activity-${a.id ?? `local-${this.hash()}`}`,
          type: 'task-user',
          category: 'activity',
          x: a.x ?? 400,
          y: a.y ?? 300,
          // dimensiones necesarias para calcular centros y dibujar edges
          width: a.width ?? 100,
          height: a.height ?? 60,
          label: a.name ?? 'Activity',
          activityId: a.id,
        }));

        // Detectar si hay un “nuevo” para seleccionarlo automáticamente
        const ids = this.activitiesCache.map(a => a.id).filter((id): id is number => id != null);
        const newId = ids.find(id => !this.seenActivityIds.has(id));
        this.seenActivityIds = new Set(ids);
        if (newId != null && this.inspectorOpen && this.inspectorKind === 'activity') {
          this.selectedActivityId = newId;
        }

        this.recomputeBoardIncludeCurrentGateways();
      });
    } else {
      console.warn('[Dashboard] No encontré stream de Activities. ¿items$ / list() / getAll() / getActivities()?');
    }
  }

  // ======== Streams tolerantes: Edges ========
  private subscribeEdgesStream(): void {
    const svc: any = this.edgeService as any;

    // Acepta múltiples convenciones: items$, list$, items.asObservable(), list(), getAll(), getEdges()
    const stream =
      svc.items$ ??
      svc.list$ ??
      (svc.items && typeof svc.items.asObservable === 'function' ? svc.items.asObservable() : undefined) ??
      (typeof svc.list === 'function' ? svc.list() : undefined) ??
      (typeof svc.getAll === 'function' ? svc.getAll() : undefined) ??
      (typeof svc.getEdges === 'function' ? svc.getEdges() : undefined);

    if (stream && typeof stream.subscribe === 'function') {
      stream.subscribe((eds: Edge[] = []) => {
        this.edgesCache = eds ?? [];
        this.edgesLayer = this.edgesCache.map((e) => ({
          id: `edge-${e.id ?? `local-${this.hash()}`}`,
          type: 'event-start',
          category: 'edge',
          x: 24,
          y: 24,
          label: e.label ?? 'Edge',
          edgeId: e.id,
          // extremos para poder trazar la línea en el SVG
          fromId: e.fromId,
          toId: e.toId,
        }));

        // Detectar nuevo edge para seleccionarlo si abrimos inspector al crear
        const ids = this.edgesCache.map(e => e.id).filter((id): id is number => id != null);
        const newId = ids.find(id => !this.seenEdgeIds.has(id));
        this.seenEdgeIds = new Set(ids);
        if (newId != null && this.inspectorOpen && this.inspectorKind === 'edge') {
          this.selectedEdgeId = newId;
        }

        this.recomputeBoardIncludeCurrentGateways();
      });
    } else {
      console.warn('[Dashboard] No encontré stream de Edges. ¿items$ / list() / getAll() / getEdges()?');
    }
  }

  // ===== Helpers de mezcla/actualización =====
  private updateActivityPosition(component: BoardComponent): void {
    if (component.category !== 'activity' || component.activityId == null) return;

    const current = this.activitiesCache.find(a => a.id === component.activityId) ?? null;
    const updated: Activity = {
      ...(current ?? { id: component.activityId, name: component.label ?? 'Activity' }),
      x: component.x,
      y: component.y,
      width: (current as any)?.width ?? 100,
      height: (current as any)?.height ?? 60,
      status: (current as any)?.status ?? 'active'
    };

    const svc: any = this.activityService as any;
    if (typeof svc.update === 'function')      svc.update(updated);
    else if (typeof svc.save === 'function')   svc.save(updated);
    else if (typeof svc.put === 'function')    svc.put(updated);
    else if (typeof svc.set === 'function')    svc.set(updated);
    else console.warn('[Dashboard] ActivityService no expone update/save/put/set');
  }

  private recomputeBoardIncludeCurrentGateways(): void {
    const gateways = this.boardComponents.filter(c => c.category === 'gateway');
    this.boardComponents = [
      ...gateways,
      ...this.activitiesLayer,
      ...this.edgesLayer
    ];
  }

  private recomputeBoardAfterLocalMove(component: BoardComponent): void {
    if (component.category === 'activity') {
      this.activitiesLayer = this.activitiesLayer.map((c) =>
        c.id === component.id ? { ...c, x: component.x, y: component.y } : c
      );
    } else if (component.category === 'edge') {
      this.edgesLayer = this.edgesLayer.map((c) =>
        c.id === component.id ? { ...c, x: component.x, y: component.y } : c
      );
    }
    this.recomputeBoardIncludeCurrentGateways();
  }

  private hash(): string {
    this.componentCounter = (this.componentCounter + 1) % 1_000_000;
    return this.componentCounter.toString(16);
  }
}
