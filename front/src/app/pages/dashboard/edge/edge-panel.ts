// src/app/pages/dashboard/edge/edge-panel.ts
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Output,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { Edge, EndpointKind } from '../../../models/Edge';
import { EdgeService } from '../../../services/edge.service';
import { Activity } from '../../../models/Activity';
import { ActivityService } from '../../../services/activity.service';
import { Gateway } from '../../../models/Gateway';
import { GatewayService } from '../../../services/gateway.service';

@Component({
  selector: 'app-edge-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edge-panel.html',
  styleUrls: ['./edge-panel.css'],
})
export class EdgePanel implements OnInit, OnChanges, OnDestroy {
  /** id que envía el Dashboard para editar un edge concreto */
  @Input() edgeId: number | null = null;

  /** Permite que el padre oculte el panel al hacer clic en la “X” */
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private edgeService = inject(EdgeService);
  private activityService = inject(ActivityService);
  private gatewayService = inject(GatewayService);
  private cdr = inject(ChangeDetectorRef);

  /** Lista reactiva de edges (store en memoria / in-memory). */
  readonly edges$: Observable<Edge[]> =
    (this.edgeService as any).list$ ?? (this.edgeService as any).items$;

  /** Actividades para poblar selects */
  readonly activities$: Observable<Activity[]> =
    (this.activityService as any).list$ ??
    (this.activityService as any).items$ ??
    (this.activityService as any).getAll?.() ??
    (this.activityService as any).list?.();

  /** Gateways para poblar selects (con fallback a HTTP) */
  readonly gateways$: Observable<Gateway[]> =
    (this.gatewayService as any).list$ ??
    (this.gatewayService as any).items$ ??
    (this.gatewayService as any).getAll?.() ??
    (this.gatewayService as any).list?.() ??
    this.gatewayService.getGateways();

  /** Estado de edición y elemento seleccionado. */
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Edge | null>(null);

  /** Snapshots para resolver @Input edgeId y armar selects. */
  private edgeSnapshot: Edge[] = [];
  private edgesSub?: Subscription;
  private actsSub?: Subscription;
  private gwsSub?: Subscription;

  activitiesSnapshot: Activity[] = [];
  gatewaysSnapshot: Gateway[] = [];

  /**
   * Form mixto:
   * - Tipado nuevo: fromType/fromId, toType/toId (requeridos)
   * - Compat legado: activitySourceId/activityDestinyId (se mantienen por ahora)
   * - label: requerido
   * - processId: opcional
   * Validación cruzada: (kind,id) de origen y destino no pueden ser iguales.
   */
  readonly form = this.fb.group(
    {
      processId: this.fb.control<number | null>(null, {
        validators: [Validators.min(1)],
      }),

      // NUEVO tipado
      fromType: this.fb.control<EndpointKind | null>(null, {
        validators: [Validators.required],
      }),
      fromId: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1)],
      }),
      toType: this.fb.control<EndpointKind | null>(null, {
        validators: [Validators.required],
      }),
      toId: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1)],
      }),

      // LEGADO (para compat mientras migras vistas antiguas)
      activitySourceId: this.fb.control<number | null>(null, {
        validators: [Validators.min(1)],
      }),
      activityDestinyId: this.fb.control<number | null>(null, {
        validators: [Validators.min(1)],
      }),

      label: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(1)],
      }),
    },
    { validators: [this.endpointsDifferentValidator()] }
  );

  // ===== Lifecycle =====
  ngOnInit(): void {
    if (this.edges$) {
      this.edgesSub = this.edges$.subscribe((list) => {
        this.edgeSnapshot = list ?? [];
        this.applyInputSelection();
      });
    } else {
      console.warn('[EdgePanel] No encontré stream de edges (list$ / items$).');
    }

    if (this.activities$) {
      this.actsSub = this.activities$.subscribe((acts) => {
        this.activitiesSnapshot = acts ?? [];
        console.log('[EdgePanel] Activities snapshot actualizado:', this.activitiesSnapshot.length, 'items');
      });
    } else {
      console.warn('[EdgePanel] No encontré stream de activities para selects.');
    }

    if (this.gateways$) {
      this.gwsSub = this.gateways$.subscribe((gws) => {
        this.gatewaysSnapshot = gws ?? [];
        console.log('[EdgePanel] Gateways recibidos en snapshot:', this.gatewaysSnapshot.length, 'items', this.gatewaysSnapshot);
        this.cdr.detectChanges();
      });
    } else {
      console.warn('[EdgePanel] No encontré stream de gateways para selects.');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('edgeId' in changes) this.applyInputSelection();
  }

  ngOnDestroy(): void {
    this.edgesSub?.unsubscribe();
    this.actsSub?.unsubscribe();
    this.gwsSub?.unsubscribe();
  }

  // ===== Validaciones =====
  /** Validador cruzado para impedir (kind,id) iguales en origen y destino */
  private endpointsDifferentValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const ft = group.get('fromType')?.value as EndpointKind | null;
      const fid = group.get('fromId')?.value as number | null;
      const tt = group.get('toType')?.value as EndpointKind | null;
      const tid = group.get('toId')?.value as number | null;

      if (ft && tt && fid != null && tid != null && ft === tt && fid === tid) {
        return { sameEndpoint: true };
      }
      return null;
    };
  }

  /** Acceso conveniente a errores */
  get sameEndpointError(): boolean {
    const e = this.form.errors as any;
    return !!(e && e['sameEndpoint']);
  }
  // Conservamos nombre previo para el HTML
  get sameActivityError(): boolean {
    return this.sameEndpointError;
  }

  /** Para *ngFor en selects/listas */
  trackByAct = (_: number, a: Activity) => a.id ?? _;
  trackByGw = (_: number, g: Gateway) => g.id ?? _;
  trackById = (_: number, e: Edge) => e.id ?? _;

  // Handlers para selects mixtos (Activities + Gateways)
  onSelectFromKindId(e: Event): void {
    const val = (e.target as HTMLSelectElement).value; // "activity:12" | "gateway:7"
    if (!val) return;
    const [kind, idStr] = val.split(':');
    const id = Number(idStr);

    this.form.patchValue({
      fromType: kind as EndpointKind,
      fromId: Number.isFinite(id) ? id : null,
      activitySourceId: kind === 'activity' && Number.isFinite(id) ? id : null, // compat
    });
    this.form.updateValueAndValidity();
  }

  onSelectToKindId(e: Event): void {
    const val = (e.target as HTMLSelectElement).value; // "activity:5" | "gateway:2"
    if (!val) return;
    const [kind, idStr] = val.split(':');
    const id = Number(idStr);

    this.form.patchValue({
      toType: kind as EndpointKind,
      toId: Number.isFinite(id) ? id : null,
      activityDestinyId: kind === 'activity' && Number.isFinite(id) ? id : null, // compat
    });
    this.form.updateValueAndValidity();
  }

  // ===== Helpers =====

  /** Si hay edgeId desde el padre, cargarlo en edición. */
  private applyInputSelection(): void {
    if (this.edgeId == null) {
      if (this.editingId() != null) this.reset();
      return;
    }
    const found = this.edgeSnapshot.find((e) => e.id === this.edgeId);
    if (found) this.edit(found);
  }

  /** Crear o actualizar según el estado. */
  submit(): void {
    if (!this.form.valid) return;
    this.editingId() ? this.update() : this.create();
  }

  /** Crear nuevo edge (tipado + compat si A→A). */
  private create(): void {
    const { processId, label, fromType, fromId, toType, toId } = this.form.value;
    if (!fromType || !toType || fromId == null || toId == null) return;

    const payload: Omit<Edge, 'id'> = {
      processId: (processId ?? undefined) as any,
      label: label ?? '',
      status: 'active',
      fromType,
      fromId,
      toType,
      toId,
    };

    if (fromType === 'activity' && toType === 'activity') {
      (payload as any).activitySourceId = fromId;
      (payload as any).activityDestinyId = toId;
    }

    const maybe$ = (this.edgeService as any).create?.(payload);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.reset());
    } else {
      (this.edgeService as any).create?.(payload);
      this.reset();
    }
  }

  /** Comenzar a editar un edge existente. */
  edit(item: Edge): void {
    this.selected.set(item);
    this.editingId.set(item.id ?? null);

    const inferredFromType: EndpointKind | null =
      item.fromType ?? (item.activitySourceId != null ? 'activity' : null);
    const inferredToType: EndpointKind | null =
      item.toType ?? (item.activityDestinyId != null ? 'activity' : null);

    const inferredFromId: number | null = item.fromId ?? item.activitySourceId ?? null;
    const inferredToId: number | null = item.toId ?? item.activityDestinyId ?? null;

    this.form.reset({
      processId: (item as any).processId ?? null,
      fromType: inferredFromType ?? (inferredFromId != null ? 'activity' : null),
      fromId: inferredFromId,
      toType: inferredToType ?? (inferredToId != null ? 'activity' : null),
      toId: inferredToId,
      activitySourceId: item.activitySourceId ?? (inferredFromType === 'activity' ? inferredFromId : null),
      activityDestinyId: item.activityDestinyId ?? (inferredToType === 'activity' ? inferredToId : null),
      label: item.label ?? '',
    });
  }

  /** Actualizar edge seleccionado (tipado + compat si A→A). */
  private update(): void {
    const current = this.selected();
    if (!current) return;

    const { processId, label, fromType, fromId, toType, toId } = this.form.value;
    if (!fromType || !toType || fromId == null || toId == null) return;

    const merged: Edge = {
      ...current,
      processId: (processId ?? undefined) as any,
      label: label ?? '',
      fromType,
      fromId,
      toType,
      toId,
    };

    if (fromType === 'activity' && toType === 'activity') {
      (merged as any).activitySourceId = fromId;
      (merged as any).activityDestinyId = toId;
    } else {
      (merged as any).activitySourceId = undefined as any;
      (merged as any).activityDestinyId = undefined as any;
    }

    const maybe$ = (this.edgeService as any).update?.(merged);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.reset());
    } else {
      (this.edgeService as any).update?.(merged);
      this.reset();
    }
  }

  /** Eliminar por id. */
  remove(id: number | undefined): void {
    if (id == null) return;
    if (this.editingId() === id) this.reset();

    const maybe$ = (this.edgeService as any).delete?.(id);
    if (maybe$?.subscribe) {
      maybe$.subscribe();
    } else {
      (this.edgeService as any).delete?.(id);
    }
  }

  /** Cancelar edición / limpiar formulario. */
  cancel(): void {
    this.reset();
  }

  /** Botón cerrar (emite al padre). */
  onClose(): void {
    this.close.emit();
  }

  /** Reset interno. */
  private reset(): void {
    this.selected.set(null);
    this.editingId.set(null);
    this.form.reset({
      processId: null,
      fromType: null,
      fromId: null,
      toType: null,
      toId: null,
      activitySourceId: null,
      activityDestinyId: null,
      label: '',
    });
  }
}
