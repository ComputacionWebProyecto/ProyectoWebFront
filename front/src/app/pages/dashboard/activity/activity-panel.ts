import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { Activity } from '../../../models/Activity';
import { ActivityService } from '../../../services/activity.service';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activity-panel.html',
  styleUrls: ['./activity-panel.css'],
})
export class ActivityPanel implements OnInit, OnChanges, OnDestroy {
  /** id que viene del Dashboard para editar un item concreto */
  @Input() activityId: number | null = null;

  /** Permite que el padre oculte el panel al hacer clic en la “X” */
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(ActivityService);

  /** Stream de actividades (solo lectura). */
  readonly activities$: Observable<Activity[]> = this.service.list$;

  /** Estado de edición */
  readonly isEditing = signal(false);
  readonly selected = signal<Activity | null>(null);

  /** Último snapshot del stream para poder buscar por id cuando cambia el @Input */
  private snapshot: Activity[] = [];
  private sub?: Subscription;

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

  ngOnInit(): void {
    // Mantén un snapshot del stream para poder resolver el @Input activityId
    this.sub = this.activities$.subscribe((list) => {
      this.snapshot = list ?? [];
      this.applyInputSelection(); // si ya hay un activityId, intenta cargarlo
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('activityId' in changes) {
      this.applyInputSelection();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Busca en el snapshot y carga en edición si hay activityId */
  private applyInputSelection(): void {
    if (this.activityId == null) {
      // Volver a modo “crear” si no hay selección
      if (this.isEditing()) this.resetForm();
      return;
    }
    const found = this.snapshot.find((a) => a.id === this.activityId);
    if (found) this.edit(found);
  }

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
      status: 'active', 
      processId: raw.processId,
      roleId: raw.roleId,
    };

    const maybe$ = (this.service as any).create?.(payload);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.resetForm());
    } else {
      (this.service as any).create?.(payload);
      this.resetForm();
    }
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
      processId: (item as any).processId ?? undefined,
      roleId: (item as any).roleId ?? undefined,
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
      processId: raw.processId,
      roleId: raw.roleId,
    };

    const maybe$ = (this.service as any).update?.(merged);
    if (maybe$?.subscribe) {
      maybe$.subscribe(() => this.resetForm());
    } else {
      (this.service as any).update?.(merged);
      this.resetForm();
    }
  }

  /** Eliminar por id */
  remove(id: number | undefined): void {
    if (id == null) return;
    const maybe$ = (this.service as any).delete?.(id);
    if (maybe$?.subscribe) {
      maybe$.subscribe();
    } else {
      (this.service as any).delete?.(id);
    }
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
      processId: undefined,
      roleId: undefined,
    });
  }
}
