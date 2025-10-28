// dashboard.ts — Merge final (pan + procesos/gateways backend + activities/edges + sin “pelotica” de edge)
// Fuentes usadas: :contentReference[oaicite:0]{index=0}  :contentReference[oaicite:1]{index=1}

import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DropdownMenuComponent } from './drop-menu/drop-menu';
import { HeaderDashboard } from './header-dashboard/header-dashboard';
import { ProcessPanel } from './process-panel/process-panel';
import { UserPanel } from './user-panel/user-panel';
import { RolePanel } from './role-panel/role-panel';

import { GatewayService } from '../../services/gateway.service';
import { ActiveProcessService } from '../../services/active-process.service';

import { Gateway } from '../../models/Gateway';
import { Activity } from '../../models/Activity';
import { Edge } from '../../models/Edge';

import { ActivityService } from '../../services/activity.service';
import { EdgeService } from '../../services/edge.service';

import { ActivityPanel } from './activity/activity-panel';
import { EdgePanel } from './edge/edge-panel';
import { Subscription } from 'rxjs';

interface BoardComponent {
  id: string;
  type: string;
  category: string; // 'gateway' | 'activity' | 'edge'
  x: number;
  y: number;
  label?: string;
  gatewayId?: number;

  // ids de entidades
  activityId?: number;
  edgeId?: number;

  // Para trazar edges y centrar activities
  fromId?: number; // activity source (o activitySourceId)
  toId?: number;   // activity destiny (o activityDestinyId)
  width?: number;
  height?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DropdownMenuComponent,
    HeaderDashboard,
    ProcessPanel,
    UserPanel,
    RolePanel,
    ActivityPanel,
    EdgePanel,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit, OnDestroy {
  // ===== UI =====
  isSidebarOpen = true;
  isProcessPanelOpen = false;
  isUserPanelOpen = false;
  isRolePanelOpen = false;

  // Inspector lateral (activity/edge)
  inspectorOpen = false;
  inspectorKind: 'activity' | 'edge' | null = null;
  selectedActivityId: number | null = null;
  selectedEdgeId: number | null = null;

  // Tablero
  boardComponents: BoardComponent[] = [];
  private componentCounter = 0;
  private isDraggingExisting = false;

  // Capas/caché locales (no afectan gateways)
  private activitiesLayer: BoardComponent[] = [];
  private edgesLayer: BoardComponent[] = [];
  private activitiesCache: Activity[] = [];
  private edgesCache: Edge[] = [];

  // Seguimiento de ids ya vistos
  private seenActivityIds = new Set<number>();
  private seenEdgeIds = new Set<number>();

  // Proceso activo (ellos)
  currentProcessId: number | null = null;
  private processSubscription?: Subscription;

  // ===== Pan del canvas =====
  isPanning = false;
  panOffsetX = 0;
  panOffsetY = 0;
  startPanX = 0;
  startPanY = 0;
  lastMouseX = 0;
  lastMouseY = 0;
  isShiftPressed = false;

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      if (
        !target.closest('.board-component') &&
        !target.closest('aside') &&
        !target.closest('header') &&
        target.closest('.board-area')
      ) {
        event.preventDefault();
        this.isPanning = true;
        this.startPanX = this.panOffsetX;
        this.startPanY = this.panOffsetY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        document.body.style.cursor = 'grabbing';
      }
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      event.preventDefault();
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      this.panOffsetX = this.startPanX + dx;
      this.panOffsetY = this.startPanY + dy;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      document.body.style.cursor = 'default';
    }
  }

  getCanvasTransform(): string {
    return `translate(${this.panOffsetX}px, ${this.panOffsetY}px)`;
  }

  @HostListener('document:keydown.shift')
  onShiftDown() {
    this.isShiftPressed = true;
    document.querySelector('.board-area')?.classList.add('shift-active');
  }
  @HostListener('document:keyup.shift')
  onShiftUp() {
    this.isShiftPressed = false;
    document.querySelector('.board-area')?.classList.remove('shift-active');
  }

  constructor(
    private gatewayService: GatewayService,
    private activityService: ActivityService,
    private edgeService: EdgeService,
    private activeProcessService: ActiveProcessService,
    private cdr: ChangeDetectorRef
  ) {}

  // Etiquetas legibles
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

  // ===== Ciclo de vida =====
  ngOnInit(): void {
    // Proceso activo
    this.activeProcessService.restoreActiveProcess();
    this.processSubscription = this.activeProcessService.activeProcessId$.subscribe((pid) => {
      this.currentProcessId = pid ?? null;
      if (this.currentProcessId) {
        this.loadGateways();
      } else {
        // si no hay proceso, ocultamos gateways; mantenemos capas locales de activity/edge
        const onlyNonGateways = this.boardComponents.filter((c) => c.category !== 'gateway');
        this.boardComponents = [...onlyNonGateways];
      }
      this.cdr.detectChanges();
    });

    // Streams
    this.subscribeActivitiesStream();
    this.subscribeEdgesStream();
  }

  ngOnDestroy(): void {
    this.processSubscription?.unsubscribe();
  }

  // ===== Toggles paneles =====
  onToggleRoles(): void {
    this.isRolePanelOpen = !this.isRolePanelOpen;
    if (this.isUserPanelOpen || this.isProcessPanelOpen) {
      this.isUserPanelOpen = false;
      this.isProcessPanelOpen = false;
    }
  }
  toggleProcessPanel(): void {
    this.isProcessPanelOpen = !this.isProcessPanelOpen;
    if (this.isUserPanelOpen || this.isRolePanelOpen) {
      this.isUserPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }
  toggleUserPanel(): void {
    this.isUserPanelOpen = !this.isUserPanelOpen;
    if (this.isProcessPanelOpen || this.isRolePanelOpen) {
      this.isProcessPanelOpen = false;
      this.isRolePanelOpen = false;
    }
  }
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // ===== Gateways (backend) =====
  loadGateways(): void {
    this.gatewayService.getGateways().subscribe({
      next: (gateways: Gateway[]) => {
        // limpiamos solo gateways previos para evitar duplicados y conservamos capas locales
        const nonGateways = this.boardComponents.filter((c) => c.category !== 'gateway');
        const gwComps: BoardComponent[] = [];

        gateways.forEach((g) => {
          if (g.status === 'active' && g.id) {
            gwComps.push({
              id: `gateway-${g.id}`,
              type: g.type,
              category: 'gateway',
              x: g.x ?? 100,
              y: g.y ?? 100,
              label: this.getComponentLabel(g.type),
              gatewayId: g.id,
            });
          }
        });

        this.boardComponents = [...gwComps, ...nonGateways];
        this.recomputeBoardIncludeCurrentGateways();
        this.cdr.detectChanges();
      },
      error: (e) => console.error('Error al cargar gateways:', e),
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
      next: () => console.log('Posición actualizada en backend'),
      error: (e) => console.error('Error al actualizar posición:', e),
    });
  }

  // ===== Drag & Drop =====
  onBoardDrop(event: DragEvent): void {
    event.preventDefault();

    const componentId = event.dataTransfer?.getData('component-id');
    if (componentId) {
      // mover existente
      const boardElement = event.currentTarget as HTMLElement;
      const rect = boardElement.getBoundingClientRect();
      const x = event.clientX - rect.left - this.panOffsetX;
      const y = event.clientY - rect.top - this.panOffsetY;

      const component = this.boardComponents.find((c) => c.id === componentId);
      if (component) {
        component.x = x - 30;
        component.y = y - 30;

        if (component.category === 'gateway' && component.gatewayId) {
          this.updateGatewayPosition(component);
        }
        if (component.category === 'activity' && component.activityId != null) {
          this.updateActivityPosition(component);
        }
        if (component.category === 'edge' && component.edgeId != null) {
          this.edgesLayer = this.edgesLayer.map((c) =>
            c.id === component.id ? { ...c, x: component.x, y: component.y } : c
          );
        }
        this.recomputeBoardAfterLocalMove(component);
      }
    } else {
      // agregar nuevo desde el menú
      const componentType = event.dataTransfer?.getData('component-type');
      const componentCategory = event.dataTransfer?.getData('component-category');
      if (componentType && componentCategory) {
        const boardElement = event.currentTarget as HTMLElement;
        const rect = boardElement.getBoundingClientRect();
        const x = event.clientX - rect.left - this.panOffsetX;
        const y = event.clientY - rect.top - this.panOffsetY;

        this.addComponentToBoard(componentType, componentCategory, x, y);

        // abrir inspector al crear Activity por DnD
        if (componentCategory === 'activity') {
          this.openInspector('activity');
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

    // seleccionar para mostrar panel
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

  onComponentDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    this.isDraggingExisting = false;
  }

  // ===== Altas de componentes =====
  addComponentToBoard(type: string, category: string, x: number, y: number): void {
    // IMPORTANTE: los Edges NO crean nodo visual (evita “pelotica”).
    // Se crean/editarán solo desde el panel.
    if (category === 'edge') {
      this.openInspector('edge');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newComponent: BoardComponent = {
      id: tempId,
      type,
      category,
      x: x - 30,
      y: y - 30,
      label: this.getComponentLabel(type),
    };

    // visual inmediato
    this.boardComponents.push(newComponent);

    if (category === 'gateway') {
      const gateway: Gateway = {
        type,
        status: 'active',
        x: newComponent.x,
        y: newComponent.y,
      };
      this.gatewayService.createGateway(gateway).subscribe({
        next: (saved: Gateway) => {
          const comp = this.boardComponents.find((c) => c.id === tempId);
          if (comp && saved.id) {
            comp.gatewayId = saved.id;
            comp.id = `gateway-${saved.id}`;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('ERROR AL GUARDAR EN BACKEND', err);
        },
      });
      return;
    }

    if (category === 'activity') {
      const a: Activity = {
        name: 'Activity',
        description: '',
        x: newComponent.x,
        y: newComponent.y,
        width: 100,
        height: 60,
        status: 'active',
      };
      const svc: any = this.activityService as any;
      if (typeof svc.create === 'function') svc.create(a);
      else if (typeof svc.add === 'function') svc.add(a);
      else if (typeof svc.new === 'function') svc.new(a);
      else console.warn('[Dashboard] ActivityService no expone create/add/new');
      return;
    }
  }

  // ===== Menú lateral (click) =====
  onComponentSelected(data: { type: string; category: string }): void {
    // Si eligen "edge" desde el menú: NO crear nada visual; solo abrir panel.
    if (data.category === 'edge') {
      this.openInspector('edge');
      return;
    }
    this.addComponentToBoard(data.type, data.category, 400, 300);
    if (data.category === 'activity') this.openInspector('activity');
  }

  // ===== Eliminar =====
  removeComponent(id: string): void {
    const component = this.boardComponents.find((c) => c.id === id);

    if (component?.gatewayId && component.category === 'gateway') {
      this.gatewayService.deleteGateway(component.gatewayId).subscribe({
        next: () => {
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al eliminar gateway:', error);
          this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
        },
      });
      return;
    }

    if (component?.category === 'activity' && component.activityId != null) {
      const svc: any = this.activityService as any;
      if (typeof svc.delete === 'function') svc.delete(component.activityId);
      else if (typeof svc.remove === 'function') svc.remove(component.activityId);
      else console.warn('[Dashboard] ActivityService no expone delete/remove');
    } else if (component?.category === 'edge' && component.edgeId != null) {
      const svc: any = this.edgeService as any;
      if (typeof svc.delete === 'function') svc.delete(component.edgeId);
      else if (typeof svc.remove === 'function') svc.remove(component.edgeId);
      else console.warn('[Dashboard] EdgeService no expone delete/remove');
    }

    this.boardComponents = this.boardComponents.filter((c) => c.id !== id);
  }

  // ===== Inspector =====
  openInspector(kind: 'activity' | 'edge', component?: BoardComponent): void {
    this.inspectorKind = kind;
    this.inspectorOpen = true;
    if (component) {
      if (kind === 'activity') this.selectedActivityId = component.activityId ?? null;
      if (kind === 'edge') this.selectedEdgeId = component.edgeId ?? null;
    }
  }
  closeInspector(): void {
    this.inspectorOpen = false;
    this.inspectorKind = null;
    this.selectedActivityId = null;
    this.selectedEdgeId = null;
  }

  // ===== Líneas SVG (edges conectados) =====
  edgeCoordsByComponent(edgeCmp: BoardComponent): { x1: number; y1: number; x2: number; y2: number } | null {
    if (edgeCmp.category !== 'edge' || edgeCmp.fromId == null || edgeCmp.toId == null) return null;
    const from = this.boardComponents.find(
      (c) => c.category === 'activity' && (c as any).activityId === edgeCmp.fromId
    );
    const to = this.boardComponents.find(
      (c) => c.category === 'activity' && (c as any).activityId === edgeCmp.toId
    );
    if (!from || !to) return null;
    const fromW = from.width ?? 100,
      fromH = from.height ?? 60;
    const toW = to.width ?? 100,
      toH = to.height ?? 60;
    return { x1: from.x + fromW / 2, y1: from.y + fromH / 2, x2: to.x + toW / 2, y2: to.y + toH / 2 };
  }

  // ===== Streams =====
  private subscribeActivitiesStream(): void {
    const svc: any = this.activityService as any;

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
          width: a.width ?? 100,
          height: a.height ?? 60,
          label: a.name ?? 'Activity',
          activityId: a.id,
        }));

        const ids = this.activitiesCache.map((a) => a.id).filter((id): id is number => id != null);
        const newId = ids.find((id) => !this.seenActivityIds.has(id));
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

  private subscribeEdgesStream(): void {
    const svc: any = this.edgeService as any;

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

        // NO dibujar “pelotica verde”: solo una entrada para que el SVG trace la línea.
        this.edgesLayer = this.edgesCache.map((e) => {
          const src = (e as any).activitySourceId ?? e.fromId;
          const dst = (e as any).activityDestinyId ?? e.toId;
          return {
            id: `edge-${e.id ?? `local-${this.hash()}`}`,
            type: 'edge-line', // distinto a 'event-start' para que el HTML no dibuje círculo
            category: 'edge',
            x: 0,
            y: 0,
            label: e.label ?? 'Edge',
            edgeId: e.id,
            fromId: src,
            toId: dst,
          };
        });

        const ids = this.edgesCache.map((e) => e.id).filter((id): id is number => id != null);
        const newId = ids.find((id) => !this.seenEdgeIds.has(id));
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

  // ===== Helpers mezcla/actualización =====
  private updateActivityPosition(component: BoardComponent): void {
    if (component.category !== 'activity' || component.activityId == null) return;

    const current = this.activitiesCache.find((a) => a.id === component.activityId) ?? null;
    const updated: Activity = {
      ...(current ?? { id: component.activityId, name: component.label ?? 'Activity' }),
      x: component.x,
      y: component.y,
      width: (current as any)?.width ?? 100,
      height: (current as any)?.height ?? 60,
      status: (current as any)?.status ?? 'active',
    };

    const svc: any = this.activityService as any;
    if (typeof svc.update === 'function') svc.update(updated);
    else if (typeof svc.save === 'function') svc.save(updated);
    else if (typeof svc.put === 'function') svc.put(updated);
    else if (typeof svc.set === 'function') svc.set(updated);
    else console.warn('[Dashboard] ActivityService no expone update/save/put/set');
  }

  private recomputeBoardIncludeCurrentGateways(): void {
    const gateways = this.boardComponents.filter((c) => c.category === 'gateway');
    this.boardComponents = [...gateways, ...this.activitiesLayer, ...this.edgesLayer];
    this.cdr.detectChanges();
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
