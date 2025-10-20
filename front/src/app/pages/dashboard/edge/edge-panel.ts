// src/app/pages/dashboard/edge/edge-panel.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { Edge } from '../../../models/Edge';
import { EdgeService } from '../../../services/edge.service';

@Component({
  selector: 'app-edge-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edge-panel.html',
  styleUrls: ['./edge-panel.css'],
})
export class EdgePanel {
  private fb = inject(FormBuilder);
  private service = inject(EdgeService);

  /** Lista reactiva de edges (store en memoria, sin backend). */
  readonly edges$: Observable<Edge[]> = this.service.list$;

  /** Estado de edición y elemento seleccionado. */
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Edge | null>(null);

  /**
   * Form:
   * - processId, activitySourceId, activityDestinyId: requeridos (>=1)
   * - label: requerido (no vacío)
   */
  readonly form = this.fb.group({
    processId: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
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

  /** Crear o actualizar según el estado. */
  submit(): void {
    if (!this.form.valid) return;
    this.editingId() ? this.update() : this.create();
  }

  /** Crear nuevo edge. */
  private create(): void {
    const { processId, activitySourceId, activityDestinyId, label } = this.form.value;
    if (processId == null || activitySourceId == null || activityDestinyId == null) return;

    const payload: Omit<Edge, 'id'> = {
      processId,
      activitySourceId,
      activityDestinyId,
      label: label ?? '',
      status: 'active',
    };

    this.service.create(payload).subscribe(() => this.reset());
  }

  /** Comenzar a editar un edge existente. */
  edit(item: Edge): void {
    this.selected.set(item);
    this.editingId.set(item.id ?? null);
    this.form.reset({
      processId: item.processId ?? null,
      activitySourceId: item.activitySourceId ?? null,
      activityDestinyId: item.activityDestinyId ?? null,
      label: item.label ?? '',
    });
  }

  /** Actualizar edge seleccionado. */
  private update(): void {
    const current = this.selected();
    if (!current) return;

    const { processId, activitySourceId, activityDestinyId, label } = this.form.value;
    if (processId == null || activitySourceId == null || activityDestinyId == null) return;

    const merged: Edge = {
      ...current,
      processId,
      activitySourceId,
      activityDestinyId,
      label: label ?? '',
    };

    this.service.update(merged).subscribe(() => this.reset());
  }

  /** Eliminar por id. */
  remove(id: number | undefined): void {
    if (id == null) return;
    if (this.editingId() === id) this.reset();
    this.service.delete(id).subscribe();
  }

  /** Cancelar edición / limpiar formulario. */
  cancel(): void {
    this.reset();
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
