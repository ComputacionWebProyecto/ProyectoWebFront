import { Component, inject, signal } from '@angular/core';
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
  private fb = inject(FormBuilder);
  private service = inject(ActivityService);

  readonly activities$: Observable<Activity[]> = this.service.list$;

  // Estado de edición
  readonly isEditing = signal(false);
  readonly selected = signal<Activity | null>(null);

  // Form: evita nulls; processId/roleId permiten undefined (NO null)
  readonly form = this.fb.group({
    name: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    description: this.fb.control('', { nonNullable: true }),
    x: this.fb.control(100, { nonNullable: true }),
    y: this.fb.control(100, { nonNullable: true }),
    width: this.fb.control(140, { nonNullable: true }),
    height: this.fb.control(80, { nonNullable: true }),
    processId: this.fb.control<number | undefined>(undefined, { nonNullable: true }),
    roleId: this.fb.control<number | undefined>(undefined, { nonNullable: true }),
  });

  /** Usado por el template para decidir “Crear vs Actualizar” */
  editingId(): number | undefined {
    return this.selected()?.id ?? undefined;
  }

  /** Handler del (ngSubmit) del formulario */
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
      processId: raw.processId, // undefined OK
      roleId: raw.roleId,       // undefined OK
    };
    this.service.create(payload).subscribe(() => this.resetForm());
  }

  /** Poner el form en modo edición con los datos del item */
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

  /** Actualizar actividad seleccionada */
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

  /** Reset a estado inicial */
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
