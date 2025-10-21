import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { Activity } from '../../../models/Activity';
import { ActivityService } from '../../../services/activity.service';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-panel.html',
  styleUrls: ['./activity-panel.css'],
})
export class ActivityPanel {
  /** Permite que el padre oculte el panel al hacer clic en la “X” */
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(ActivityService);

  /** Stream de actividades (solo lectura) */
  readonly activities$: Observable<Activity[]> = this.service.list$;

  /** Estado de edición */
  readonly isEditing = signal(false);
  readonly selected = signal<Activity | null>(null);

  /**
   * Formulario
   * Nota: para los opcionales usamos `number | undefined` (NO null).
   */
  readonly form = this.fb.group({
    name: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: this.fb.control('', { nonNullable: true }),
    x: this.fb.control(100, { nonNullable: true }),
    y: this.fb.control(100, { nonNullable: true }),
    width: this.fb.control(140, { nonNullable: true }),
    height: this.fb.control(80, { nonNullable: true }),
    processId: this.fb.control<number | undefined>(undefined, { nonNullable: true }),
    roleId: this.fb.control<number | undefined>(undefined, { nonNullable: true }),
  });

  /** Devuelve el id si está editando (para el botón Crear/Actualizar) */
  editingId(): number | undefined {
    return this.selected()?.id ?? undefined;
  }

  /** (ngSubmit) del formulario */
  submit(): void {
    this.editingId() ? this.update() : this.create();
  }

  /** Crear nueva actividad */
  private create(): void {
    if (!this.form.valid) return;

    const raw = this.form.getRawValue();
    const payload: Omit<Activity, 'id'> = {
      name: raw.name,
      description: raw.description,
      x: raw.x,
      y: raw.y,
      width: raw.width,
      height: raw.height,
      processId: raw.processId, // `undefined` permitido
      roleId: raw.roleId,       // `undefined` permitido
    };

    this.service.create(payload).subscribe(() => this.resetForm());
  }

  /** Cargar datos en el form para editar */
  edit(item: Activity): void {
    this.isEditing.set(true);
    this.selected.set(item);

    this.form.patchValue({
      name: item.name ?? '',
      description: item.description ?? '',
      x: item.x ?? 100,
      y: item.y ?? 100,
      width: item.width ?? 140,
      height: item.height ?? 80,
      processId: item.processId ?? undefined,
      roleId: item.roleId ?? undefined,
    });
  }

  /** Actualizar la actividad seleccionada */
  private update(): void {
    const current = this.selected();
    if (!current || !this.form.valid) return;

    const raw = this.form.getRawValue();
    const merged: Activity = {
      ...current,
      name: raw.name,
      description: raw.description,
      x: raw.x,
      y: raw.y,
      width: raw.width,
      height: raw.height,
      processId: raw.processId, // number | undefined
      roleId: raw.roleId,       // number | undefined
    };

    this.service.update(merged).subscribe(() => this.resetForm());
  }

  /** Eliminar por id */
  remove(id: number | undefined): void {
    if (id == null) return;
    this.service.delete(id).subscribe();
    if (this.selected()?.id === id) this.resetForm();
  }

  /** Cancelar edición */
  cancel(): void {
    this.resetForm();
  }

  /** Emitir evento para que el padre oculte el panel */
  onClose(): void {
    this.close.emit();
  }

  /** Volver a estado inicial del form */
  private resetForm(): void {
    this.isEditing.set(false);
    this.selected.set(null);
    this.form.reset({
      name: '',
      description: '',
      x: 100,
      y: 100,
      width: 140,
      height: 80,
      processId: undefined, // NO null
      roleId: undefined,    // NO null
    });
  }
}
