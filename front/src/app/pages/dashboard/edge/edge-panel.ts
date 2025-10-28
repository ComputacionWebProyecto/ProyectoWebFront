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

import { Edge } from '../../../models/Edge';
import { EdgeService } from '../../../services/edge.service';
import { Activity } from '../../../models/Activity';
import { ActivityService } from '../../../services/activity.service';

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

  /** Lista reactiva de edges (store en memoria / in-memory). */
  readonly edges$: Observable<Edge[]> =
    (this.edgeService as any).list$ ?? (this.edgeService as any).items$;

  /** Actividades para poblar los selects (tolerante a distintas APIs del servicio). */
  readonly activities$: Observable<Activity[]> =
    (this.activityService as any).list$ ??
    (this.activityService as any).items$ ??
    (this.activityService as any).getAll?.() ??
    (this.activityService as any).list?.();

  /** Estado de edición y elemento seleccionado. */
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Edge | null>(null);

  /** Snapshots para resolver @Input edgeId y renderizar selects. */
  private edgeSnapshot: Edge[] = [];
  private edgesSub?: Subscription;
  private actsSub?: Subscription;
  activitiesSnapshot: Activity[] = [];

  /**
   * Form:
   * - activitySourceId y activityDestinyId: requeridos (>=1)
   * - label: requerido (no vacío)
   * - processId: opcional (si lo usas puedes dejarlo vacío)
   * + Validador cruzado: source != destiny
   */
  readonly form = this.fb.group(
    {
      processId: this.fb.control<number | null>(null, {
        validators: [Validators.min(1)],
      }),
      activitySourceId: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1)],
      }),
      activityDestinyId: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1)],
      }),
      label: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(1)],
      }),
    },
    { validators: [this.sourceDifferentFromDestValidator()] }
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
      });
    } else {
      console.warn('[EdgePanel] No encontré stream de activities para selects.');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('edgeId' in changes) this.applyInputSelection();
  }

  ngOnDestroy(): void {
    this.edgesSub?.unsubscribe();
    this.actsSub?.unsubscribe();
  }

  // ===== Helpers =====
  /** Validator cruzado para impedir source == destiny */
  private sourceDifferentFromDestValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const s = group.get('activitySourceId')?.value;
      const d = group.get('activityDestinyId')?.value;
      if (s != null && d != null && s === d) return { sameActivity: true };
      return null;
    };
  }

  /** Acceso conveniente al error de igualdad */
  get sameActivityError(): boolean {
    const e = this.form.errors as any;
    return !!(e && e['sameActivity']);
  }

  /** Para *ngFor en selects/listas */
  trackByAct = (_: number, a: Activity) => a.id ?? _;
  trackById = (_: number, e: Edge) => e.id ?? _;

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

  /** Crear nuevo edge. */
  private create(): void {
    const { processId, activitySourceId, activityDestinyId, label } = this.form.value;
    if (activitySourceId == null || activityDestinyId == null) return;

    const payload: Omit<Edge, 'id'> = {
      processId: (processId ?? undefined) as any, // opcional
      activitySourceId,
      activityDestinyId,
      label: label ?? '',
      status: 'active',
    };

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
    this.form.reset({
      processId: (item as any).processId ?? null,
      activitySourceId: (item as any).activitySourceId ?? null,
      activityDestinyId: (item as any).activityDestinyId ?? null,
      label: item.label ?? '',
    });
  }

  /** Actualizar edge seleccionado. */
  private update(): void {
    const current = this.selected();
    if (!current) return;

    const { processId, activitySourceId, activityDestinyId, label } = this.form.value;
    if (activitySourceId == null || activityDestinyId == null) return;

    const merged: Edge = {
      ...current,
      processId: (processId ?? undefined) as any,
      activitySourceId,
      activityDestinyId,
      label: label ?? '',
    };

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
      activitySourceId: null,
      activityDestinyId: null,
      label: '',
    });
  }
}
