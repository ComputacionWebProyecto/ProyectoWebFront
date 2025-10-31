// src/app/pages/dashboard/gateway/gateway-panel.ts
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
} from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { Gateway } from '../../../models/Gateway';
import { GatewayService } from '../../../services/gateway.service';

@Component({
  selector: 'app-gateway-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gateway-panel.html',
  styleUrls: ['./gateway-panel.css'],
})
export class GatewayPanel implements OnInit, OnChanges, OnDestroy {
  /** id que envía el Dashboard para editar un gateway concreto */
  @Input() gatewayId: number | null = null;

  /** Permite que el padre oculte el panel al hacer clic en la "X" */
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(GatewayService);
  private cdr = inject(ChangeDetectorRef);

  /** Lista reactiva de gateways desde el servicio */
  readonly gateways$: Observable<Gateway[]> = this.service.list$;

  /** Estado de edición y elemento seleccionado */
  readonly isEditing = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Gateway | null>(null);

  /** Snapshot para resolver @Input gatewayId */
  private gatewaySnapshot: Gateway[] = [];
  private gatewaySub?: Subscription;

  /** Tipos de gateway disponibles */
  readonly gatewayTypes = [
    { value: 'decision-gateway', label: 'Decisión (?)' },
    { value: 'parallel-gateway', label: 'Paralelo (+)' },
    { value: 'exclusive-gateway', label: 'Exclusivo (X)' },
  ];

  /**
   * Form para gateway:
   * - type: tipo de gateway (requerido)
   * - processId: relación con proceso (opcional)
   * - status: estado (requerido, default 'active')
   * 
   * Nota: x, y se gestionan internamente desde el canvas al crear/mover
   */
  readonly form = this.fb.group({
    type: this.fb.control<string>('decision-gateway', {
      validators: [Validators.required],
    }),
    processId: this.fb.control<number | null>(null, {
      validators: [Validators.min(1)],
    }),
    status: this.fb.control<string>('active', {
      validators: [Validators.required],
    }),
  });

  // ===== Lifecycle =====
  ngOnInit(): void {
    if (this.gateways$) {
      this.gatewaySub = this.gateways$.subscribe((list) => {
        this.gatewaySnapshot = list ?? [];
        this.applyInputSelection();
      });
    } else {
      console.warn('[GatewayPanel] No encontré stream de gateways (list$).');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('gatewayId' in changes) this.applyInputSelection();
  }

  ngOnDestroy(): void {
    this.gatewaySub?.unsubscribe();
  }

  // ===== Helpers =====

  /** Si hay gatewayId desde el padre, cargarlo en edición */
  private applyInputSelection(): void {
    if (this.gatewayId == null) {
      if (this.editingId() != null) this.reset();
      return;
    }
    const found = this.gatewaySnapshot.find((g) => g.id === this.gatewayId);
    if (found) this.edit(found);
  }

  /** Crear o actualizar según el estado */
  submit(): void {
    if (!this.form.valid) return;
    this.editingId() ? this.update() : this.create();
  }

  /** Crear nuevo gateway desde el canvas (con posición) */
  private create(): void {
    const raw = this.form.getRawValue();
    
    // Posición por defecto (el dashboard la sobrescribe al arrastrarlo)
    const payload: Omit<Gateway, 'id'> = {
      type: raw.type!,
      x: 300, 
      y: 200, 
      status: raw.status!,
      processId: raw.processId ?? undefined,
    };

    this.service.create(payload).subscribe({
      next: () => this.reset(),
      error: (err) => console.error('[GatewayPanel] Error al crear:', err),
    });
  }

  /** Comenzar a editar un gateway existente */
  edit(item: Gateway): void {
    this.isEditing.set(true);
    this.selected.set(item);
    this.editingId.set(item.id ?? null);

    this.form.reset({
      type: item.type,
      processId: item.processId ?? null,
      status: item.status,
    });
  }

  /** Actualizar gateway seleccionado */
  private update(): void {
    const current = this.selected();
    if (!current || !current.id) return;

    const raw = this.form.getRawValue();
    
    // Mantener posición actual del canvas (x, y no se editan desde el panel)
    const merged: Gateway = {
      ...current,
      type: raw.type!,
      status: raw.status!,
      processId: raw.processId ?? undefined,
    };

    this.service.update(merged).subscribe({
      next: () => this.reset(),
      error: (err) => console.error('[GatewayPanel] Error al actualizar:', err),
    });
  }

  /** Eliminar por id */
  remove(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Eliminar este gateway?')) return;

    if (this.editingId() === id) this.reset();

    this.service.delete(id).subscribe({
      next: () => {},
      error: (err) => console.error('[GatewayPanel] Error al eliminar:', err),
    });
  }

  /** Cancelar edición / limpiar formulario */
  cancel(): void {
    this.reset();
  }

  /** Botón cerrar (emite al padre) */
  onClose(): void {
    this.close.emit();
  }

  /** Reset interno */
  private reset(): void {
    this.isEditing.set(false);
    this.selected.set(null);
    this.editingId.set(null);
    this.form.reset({
      type: 'decision-gateway',
      processId: null,
      status: 'active',
    });
  }

  /** Obtener etiqueta legible del tipo de gateway */
  getGatewayLabel(type: string): string {
    const found = this.gatewayTypes.find(gt => gt.value === type);
    return found?.label ?? type;
  }

  /** TrackBy para *ngFor */
  trackById = (_: number, g: Gateway) => g.id ?? _;
}
