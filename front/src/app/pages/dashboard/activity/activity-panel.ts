/**
 * ACTIVITY PANEL COMPONENT
 * 
 * Panel lateral para la gestión CRUD de actividades en el proceso de negocio.
 * Permite crear nuevas actividades y editar/eliminar las existentes mediante
 * un formulario reactivo con validaciones.
 * 
 * ARQUITECTURA:
 * Este componente sigue el patrón de "panel lateral reutilizable" con dos modos:
 * - MODO CREAR: Formulario vacío para crear una nueva actividad
 * - MODO EDITAR: Formulario pre-poblado para modificar una actividad existente
 * 
 * COMUNICACIÓN CON EL PADRE (Dashboard):
 * - INPUT activityId: El Dashboard puede enviar un id para forzar la carga en modo edición
 * - OUTPUT close: El panel emite este evento para que el Dashboard lo oculte
 * 
 * GESTIÓN DE ESTADO:
 * - Signals: isEditing (boolean), selected (Activity | null)
 * - FormGroup reactivo con validaciones sincrónicas
 * - Snapshot local del stream de actividades para resolución de ids
 * 
 * CICLO DE VIDA:
 * - ngOnInit: Suscribe al stream de actividades y mantiene snapshot actualizado
 * - ngOnChanges: Detecta cambios en activityId y carga la actividad correspondiente
 * - ngOnDestroy: Limpia suscripción para prevenir memory leaks
 * 
 * FORMULARIO:
 * Los campos del formulario están configurados con nonNullable:true excepto:
 * - processId: number | undefined (opcional, actividad puede no estar asignada a proceso)
 * - roleId: number | undefined (opcional, actividad puede no tener rol específico)
 * 
 * Validaciones:
 * - name: requerido, mínimo 2 caracteres
 * - description: opcional
 * - x, y, width, height: numéricos con valores por defecto
 * 
 * INTEGRACIÓN CON ACTIVITYSERVICE:
 * El componente llama a create(), update() y delete() del servicio.
 * Usa duck typing (as any) para manejar la dualidad Observable/void durante
 * la transición mock → backend HTTP.
 * 
 * USO TÍPICO:
 * ```html
 * <app-activity-panel 
 *   [activityId]="selectedActivityId"
 *   (close)="hideActivityPanel()"
 * />
 * ```
 */

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
  /**
   * INPUT: activityId
   * 
   * Identificador de la actividad a editar. Cuando el Dashboard asigna un valor,
   * el panel automáticamente carga esa actividad en el formulario (modo edición).
   * 
   * Si se establece en null, el panel vuelve a modo crear.
   */
  @Input() activityId: number | null = null;

  /**
   * OUTPUT: close
   * 
   * Evento emitido cuando el usuario hace clic en el botón de cerrar (X).
   * El Dashboard escucha este evento para ocultar el panel.
   */
  @Output() close = new EventEmitter<void>();

  /**
   * INYECCIÓN DE DEPENDENCIAS
   * 
   * Utiliza inject() de Angular 16+ para inyección standalone.
   */
  private fb = inject(FormBuilder);
  private service = inject(ActivityService);

  /**
   * STREAM DE DATOS REACTIVO
   * 
   * Observable que emite la lista completa de actividades cada vez que cambia el store.
   * El template puede suscribirse con el pipe async o este componente puede mantener
   * un snapshot local.
   */
  readonly activities$: Observable<Activity[]> = this.service.list$;

  /**
   * ESTADO LOCAL CON SIGNALS
   * 
   * - isEditing: true cuando hay una actividad cargada para editar
   * - selected: actividad actualmente en edición (null si modo crear)
   * 
   * Las signals permiten reactividad granular y mejor rendimiento que BehaviorSubject
   * para estado de UI local.
   */
  readonly isEditing = signal(false);
  readonly selected = signal<Activity | null>(null);

  /**
   * SNAPSHOT LOCAL Y SUSCRIPCIÓN
   * 
   * - snapshot: copia de la última lista emitida por activities$, necesaria para
   *   buscar actividades por id cuando cambia el @Input activityId
   * - sub: referencia a la suscripción para limpiarla en ngOnDestroy
   */
  private snapshot: Activity[] = [];
  private sub?: Subscription;

  /**
   * FORMULARIO REACTIVO
   * 
   * Configurado con FormBuilder y validaciones sincrónicas.
   * 
   * CAMPOS:
   * - name: string requerido, mínimo 2 caracteres
   * - description: string opcional
   * - x, y: coordenadas en el canvas (píxeles)
   * - width, height: dimensiones del rectángulo visual
   * - processId: number | undefined, referencia al proceso padre
   * - roleId: number | undefined, rol asignado a la actividad
   * 
   * NOTA SOBRE OPCIONALES:
   * Los campos opcionales usan number | undefined (NO null) con nonNullable:true.
   * Esto previene valores null que pueden causar problemas de tipado.
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

  /**
   * CICLO DE VIDA: INICIALIZACIÓN
   * 
   * Se ejecuta una vez al crear el componente.
   * 
   * COMPORTAMIENTO:
   * 1. Suscribe al stream de actividades
   * 2. Mantiene actualizado el snapshot local cada vez que el stream emite
   * 3. Llama a applyInputSelection() por si ya hay un activityId inicial
   * 
   * PROPÓSITO DEL SNAPSHOT:
   * El stream activities$ es asíncrono, pero necesitamos acceso síncrono para
   * resolver el @Input activityId cuando cambia. El snapshot permite buscar
   * la actividad sin crear una cadena de observables anidados.
   */
  ngOnInit(): void {
    this.sub = this.activities$.subscribe((list) => {
      this.snapshot = list ?? [];
      this.applyInputSelection();
    });
  }

  /**
   * CICLO DE VIDA: DETECCIÓN DE CAMBIOS EN INPUTS
   * 
   * Se ejecuta cada vez que el padre modifica el @Input activityId.
   * 
   * COMPORTAMIENTO:
   * Si detecta cambio en activityId, intenta cargar la actividad correspondiente
   * en el formulario (modo edición). Si activityId es null, vuelve a modo crear.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('activityId' in changes) {
      this.applyInputSelection();
    }
  }

  /**
   * CICLO DE VIDA: LIMPIEZA
   * 
   * Se ejecuta al destruir el componente.
   * 
   * COMPORTAMIENTO:
   * Cancela la suscripción al stream para prevenir memory leaks.
   * 
   * IMPORTANCIA:
   * Sin esta limpieza, la suscripción seguiría activa aunque el componente
   * ya no esté en el DOM, consumiendo memoria y procesamiento innecesarios.
   */
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /**
   * Aplica la selección basada en el @Input activityId.
   * 
   * COMPORTAMIENTO:
   * 1. Si activityId es null:
   *    - Si estaba en modo edición, resetea el formulario a modo crear
   *    - Si ya estaba en modo crear, no hace nada
   * 2. Si activityId tiene un valor:
   *    - Busca la actividad en el snapshot local
   *    - Si la encuentra, llama a edit() para cargarla en el formulario
   *    - Si no la encuentra, no hace nada (puede ser que aún no esté en el snapshot)
   * 
   * INVOCACIÓN:
   * - Llamado automáticamente en ngOnInit (por si hay activityId inicial)
   * - Llamado automáticamente en ngOnChanges (cuando cambia activityId)
   * - Llamado cada vez que el snapshot se actualiza (por si la actividad recién llegó)
   * 
   * SINCRONIZACIÓN:
   * Este método resuelve el problema de sincronización entre el @Input (síncrono)
   * y el stream de actividades (asíncrono).
   */
  private applyInputSelection(): void {
    if (this.activityId == null) {
      if (this.isEditing()) this.resetForm();
      return;
    }
    const found = this.snapshot.find((a) => a.id === this.activityId);
    if (found) this.edit(found);
  }

  /**
   * Retorna el id de la actividad en edición o undefined si está en modo crear.
   * 
   * RETORNO:
   * - number: id de la actividad seleccionada (modo editar)
   * - undefined: no hay actividad seleccionada (modo crear)
   * 
   * USO TÍPICO:
   * El template usa este método para determinar el texto del botón submit:
   * ```html
   * <button>{{ editingId() ? 'Actualizar' : 'Crear' }}</button>
   * ```
   */
  editingId(): number | undefined {
    return this.selected()?.id ?? undefined;
  }

  /**
   * Manejador del evento submit del formulario.
   * 
   * COMPORTAMIENTO:
   * - Si hay una actividad en edición (editingId() retorna un número), llama a update()
   * - Si no hay actividad en edición (editingId() es undefined), llama a create()
   * 
   * DELEGACIÓN:
   * Este método no contiene lógica propia, solo decide a qué método delegar.
   * Es el punto de entrada único desde el template (ngSubmit)="submit()".
   */
  submit(): void {
    this.editingId() ? this.update() : this.create();
  }

  /**
   * Crea una nueva actividad en el servicio y resetea el formulario.
   * 
   * VALIDACIÓN:
   * Si el formulario no es válido, aborta sin hacer nada. Las validaciones
   * visuales del template mostrarán los errores al usuario.
   * 
   * COMPORTAMIENTO:
   * 1. Obtiene los valores del formulario con getRawValue()
   * 2. Construye un payload Omit<Activity, 'id'> (el id lo genera el backend)
   * 3. Establece status='active' por defecto
   * 4. Llama a service.create() con el payload
   * 5. Si create() retorna Observable, suscribe y espera respuesta
   * 6. Si create() retorna void, ejecuta directamente
   * 7. Resetea el formulario a modo crear después de éxito
   * 
   * DUCK TYPING:
   * Usa (as any) porque durante la transición mock → backend HTTP, create()
   * puede retornar void o Observable<Activity>. Este patrón evita errores de
   * tipado mientras se mantiene la flexibilidad.
   * 
   * RESETEO:
   * resetForm() limpia el formulario y vuelve a modo crear, listo para
   * crear otra actividad sin necesidad de cerrar/abrir el panel.
   */
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

  /**
   * Carga una actividad en el formulario para editar.
   * 
   * PARÁMETROS:
   * - item: Actividad completa (con id) a editar
   * 
   * COMPORTAMIENTO:
   * 1. Activa el modo edición con isEditing.set(true)
   * 2. Guarda la referencia a la actividad en selected
   * 3. Carga los valores en el formulario con patchValue()
   * 4. Usa operador nullish coalescing (??) para valores por defecto
   * 
   * VALORES POR DEFECTO:
   * Si algún campo viene null/undefined, usa valores razonables:
   * - strings vacíos para name/description
   * - 100 para x/y (centrado relativo)
   * - 140x80 para width/height (tamaño estándar de actividad)
   * - undefined para processId/roleId (campos opcionales)
   * 
   * INVOCACIÓN:
   * - Llamado por applyInputSelection() cuando el padre envía un activityId
   * - Puede ser llamado directamente desde el template (lista de actividades)
   * 
   * EFECTO EN EL TEMPLATE:
   * Al cambiar isEditing y selected, el template reactivamente:
   * - Cambia el título del panel de "Nueva Actividad" a "Editar Actividad"
   * - Cambia el botón submit de "Crear" a "Actualizar"
   * - Muestra el botón "Cancelar"
   */
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

  /**
   * Actualiza la actividad en edición con los valores del formulario.
   * 
   * VALIDACIONES:
   * - Si no hay actividad seleccionada (selected() es null), aborta
   * - Si el formulario no es válido, aborta
   * 
   * COMPORTAMIENTO:
   * 1. Obtiene la actividad actual de selected()
   * 2. Obtiene los valores del formulario con getRawValue()
   * 3. Hace merge de la actividad existente con los nuevos valores (spread operator)
   * 4. Llama a service.update() con el objeto merged
   * 5. Si update() retorna Observable, suscribe y espera respuesta
   * 6. Si update() retorna void, ejecuta directamente
   * 7. Resetea el formulario a modo crear después de éxito
   * 
   * PRESERVACIÓN DEL ID:
   * El merge { ...current, ...campos } preserva el id y otros campos que no
   * están en el formulario (como createdAt, updatedAt si existieran).
   * 
   * DUCK TYPING:
   * Mismo patrón que create() para manejar la dualidad Observable/void.
   * 
   * RESETEO:
   * Después de actualizar, vuelve a modo crear. Esto permite al usuario
   * crear una nueva actividad inmediatamente si lo desea.
   */
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

  /**
   * Elimina una actividad por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador de la actividad a eliminar (puede ser undefined)
   * 
   * VALIDACIÓN:
   * Si id es null o undefined, aborta sin hacer nada.
   * 
   * COMPORTAMIENTO:
   * 1. Llama a service.delete() con el id
   * 2. Si delete() retorna Observable, suscribe (sin callback necesario)
   * 3. Si delete() retorna void, ejecuta directamente
   * 4. Si la actividad eliminada es la que está en edición, resetea el formulario
   * 
   * AUTO-LIMPIEZA:
   * Si el usuario elimina la actividad que está editando, el formulario se
   * limpia automáticamente para evitar quedarse en un estado inconsistente.
   * 
   * INVOCACIÓN:
   * Típicamente llamado desde el template con el id de un item de la lista:
   * ```html
   * <button (click)="remove(activity.id)">Eliminar</button>
   * ```
   * 
   * DUCK TYPING:
   * Mismo patrón que create() y update() para manejar Observable/void.
   */
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

  /**
   * Cancela la edición actual y vuelve a modo crear.
   * 
   * COMPORTAMIENTO:
   * Llama a resetForm() para limpiar el formulario y el estado.
   * 
   * INVOCACIÓN:
   * Botón "Cancelar" visible solo en modo edición:
   * ```html
   * <button *ngIf="isEditing()" (click)="cancel()">Cancelar</button>
   * ```
   * 
   * DIFERENCIA CON onClose():
   * - cancel() resetea el formulario pero NO cierra el panel
   * - onClose() cierra el panel pero NO resetea el formulario
   */
  cancel(): void {
    this.resetForm();
  }

  /**
   * Emite evento para que el Dashboard oculte este panel.
   * 
   * COMPORTAMIENTO:
   * Emite el evento close sin payload. El Dashboard escucha este evento
   * y oculta el panel (típicamente con *ngIf o [class.hidden]).
   * 
   * INVOCACIÓN:
   * Botón "X" en la esquina superior derecha del panel:
   * ```html
   * <button class="close-btn" (click)="onClose()">✕</button>
   * ```
   * 
   * NO RESETEA:
   * Este método intencionalmente NO llama a resetForm(). Si el usuario
   * cierra el panel y lo vuelve a abrir, verá el mismo estado. Para limpiar
   * el formulario, el Dashboard debería establecer activityId = null.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Resetea el formulario a su estado inicial (modo crear).
   * 
   * COMPORTAMIENTO:
   * 1. Desactiva el modo edición: isEditing.set(false)
   * 2. Limpia la selección: selected.set(null)
   * 3. Resetea todos los campos del formulario a sus valores por defecto
   * 
   * VALORES POR DEFECTO:
   * - name, description: strings vacíos
   * - x: 100, y: 100 (posición inicial en canvas)
   * - width: 140, height: 80 (dimensiones estándar)
   * - processId, roleId: undefined (sin asignación)
   * 
   * INVOCACIÓN INTERNA:
   * Llamado por:
   * - create() después de crear exitosamente
   * - update() después de actualizar exitosamente
   * - cancel() cuando el usuario cancela la edición
   * - remove() si se elimina la actividad en edición
   * - applyInputSelection() si activityId cambia a null
   * 
   * EFECTO EN EL TEMPLATE:
   * Al cambiar isEditing y selected, el template reactivamente vuelve a
   * mostrar el título "Nueva Actividad" y el botón "Crear".
   */
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
