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
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { Edge } from '../../../models/Edge';
import { EdgeService } from '../../../services/edge.service';

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
  private service = inject(EdgeService);

  /** Lista reactiva de edges (store en memoria / in-memory). */
  readonly edges$: Observable<Edge[]> =
    (this.service as any).list$ ?? (this.service as any).items$;

  /** Estado de edición y elemento seleccionado. */
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Edge | null>(null);

  /** Snapshot para resolver el @Input edgeId cuando cambie. */
  private snapshot: Edge[] = [];
  private sub?: Subscription;

  /**
   * Form:
   * - activitySourceId y activityDestinyId: requeridos (>=1)
   * - label: requerido (no vacío)
   * - processId: opcional (si lo usas puedes dejarlo vacío)
   */
  readonly form = this.fb.group({
    processId: this.fb.control<number | null>(null, {
      // opcional; si lo rellenas validará que sea >= 1
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
  });

  // Lifecycle
  ngOnInit(): void {
    if (this.edges$) {
      this.sub = this.edges$.subscribe((list) => {
        this.snapshot = list ?? [];
        this.applyInputSelection();
      });
    } else {
      console.warn('[EdgePanel] No encontré stream de edges (list$ / items$).');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('edgeId' in changes) {
      this.applyInputSelection();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Si hay edgeId desde el padre, cargarlo en edición. */
  private applyInputSelection(): void {
    if (this.edgeId == null) {
      // volver a modo “crear” si no hay selección
      if (this.editingId() != null) this.reset();
      return;
    }
    const found = this.snapshot.find((e) => e.id === this.edgeId);
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
      // processId es opcional
      processId: (processId ?? undefined) as any,
      activitySourceId,
      activityDestinyId,
      label: label ?? '',
      status: 'active',
    };

    const maybe$ = (this.service as any).create?.(payload);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.reset());
    } else {
      (this.service as any).create?.(payload);
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

    const maybe$ = (this.service as any).update?.(merged);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.reset());
    } else {
      (this.service as any).update?.(merged);
      this.reset();
    }
  }

  /** Eliminar por id. */
  remove(id: number | undefined): void {
    if (id == null) return;
    if (this.editingId() === id) this.reset();

    const maybe$ = (this.service as any).delete?.(id);
    if (maybe$?.subscribe) {
      maybe$.subscribe();
    } else {
      (this.service as any).delete?.(id);
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

  /** trackBy para *ngFor. */
  trackById = (index: number, e: Edge) => e.id ?? index;
}
