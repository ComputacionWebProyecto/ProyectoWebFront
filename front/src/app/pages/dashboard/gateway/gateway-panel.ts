/**
 * GATEWAY PANEL COMPONENT
 *
 * Panel lateral para la gestión CRUD de gateways (puntos de decisión, paralelismo
 * y convergencia) en el proceso de negocio. Permite crear nuevos gateways y
 * editar/eliminar los existentes mediante un formulario reactivo.
 *
 * ARQUITECTURA:
 * Este componente sigue el patrón de "panel lateral reutilizable" con dos modos:
 * - MODO CREAR: Formulario con tipo de gateway seleccionado para crear nuevo nodo
 * - MODO EDITAR: Formulario pre-poblado para modificar un gateway existente
 *
 * COMUNICACIÓN CON EL PADRE (Dashboard):
 * - INPUT gatewayId: El Dashboard puede enviar un id para forzar la carga en modo edición
 * - OUTPUT close: El panel emite este evento para que el Dashboard lo oculte
 *
 * GESTIÓN DE ESTADO:
 * - Signals: isEditing (boolean), editingId (number | null), selected (Gateway | null)
 * - FormGroup reactivo con validaciones sincrónicas
 * - Snapshot local del stream de gateways para resolución de ids
 *
 * CICLO DE VIDA:
 * - ngOnInit: Suscribe al stream de gateways y mantiene snapshot actualizado
 * - ngOnChanges: Detecta cambios en gatewayId y carga el gateway correspondiente
 * - ngOnDestroy: Limpia suscripción para prevenir memory leaks
 *
 * FORMULARIO:
 * Los campos del formulario NO incluyen coordenadas (x, y) porque estas se gestionan
 * desde el canvas mediante drag & drop. El panel solo edita propiedades lógicas:
 * - type: tipo de gateway (decision-gateway, parallel-gateway, exclusive-gateway)
 * - processId: número | null (opcional, gateway puede no estar asignado a proceso)
 * - status: 'active' | 'inactive' (estado del gateway)
 *
 * Validaciones:
 * - type: requerido (debe ser uno de los tipos válidos)
 * - processId: opcional, mínimo 1 si se proporciona
 * - status: requerido (default 'active')
 *
 * TIPOS DE GATEWAY:
 * - decision-gateway (?): Punto de decisión donde el flujo toma una de varias rutas
 * - parallel-gateway (+): Divide el flujo en múltiples ramas paralelas
 * - exclusive-gateway (X): Similar a decisión pero con semántica exclusiva
 *
 * INTEGRACIÓN CON GATEWAYSERVICE:
 * El componente llama a create(), update() y delete() del servicio.
 * Todos los métodos retornan Observables, por lo que se suscriben con callbacks
 * para manejar éxito/error.
 *
 * DIFERENCIAS CON ACTIVITY-PANEL:
 * - No tiene campos de coordenadas en el formulario (las gestiona el canvas)
 * - Usa ChangeDetectorRef para forzar detección de cambios en ciertos casos
 * - Incluye método getGatewayLabel() para mostrar tipos legibles
 * - Incluye trackById para optimizar *ngFor en listas
 *
 * USO TÍPICO:
 * ```html
 * <app-gateway-panel
 *   [gatewayId]="selectedGatewayId"
 *   (close)="hideGatewayPanel()"
 * />
 * ```
 */

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
import { ActiveProcessService } from '../../../services/active-process.service';

@Component({
  selector: 'app-gateway-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gateway-panel.html',
  styleUrls: ['./gateway-panel.css'],
})
export class GatewayPanel implements OnInit, OnChanges, OnDestroy {
  /**
   * INPUT: gatewayId
   *
   * Identificador del gateway a editar. Cuando el Dashboard asigna un valor,
   * el panel automáticamente carga ese gateway en el formulario (modo edición).
   *
   * Si se establece en null, el panel vuelve a modo crear.
   */
  @Input() gatewayId: number | null = null;

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
   * - FormBuilder: Constructor de formularios reactivos
   * - GatewayService: Servicio de gestión de gateways con store reactivo
   * - ActiveProcessService: Servicio para obtener el proceso activo
   * - ChangeDetectorRef: Permite forzar detección de cambios cuando Angular
   *   no detecta automáticamente (útil con signals y operaciones asíncronas)
   */
  private fb = inject(FormBuilder);
  private service = inject(GatewayService);
  private activeProcessService = inject(ActiveProcessService);
  private cdr = inject(ChangeDetectorRef);

  /**
   * STREAM DE DATOS REACTIVO
   *
   * Observable que emite la lista completa de gateways cada vez que cambia el store.
   * El template puede suscribirse con el pipe async o este componente puede mantener
   * un snapshot local para acceso síncrono.
   */
  readonly gateways$: Observable<Gateway[]> = this.service.list$;

  /**
   * ESTADO LOCAL CON SIGNALS
   *
   * - isEditing: true cuando hay un gateway cargado para editar
   * - editingId: id del gateway en edición (null si modo crear)
   * - selected: gateway completo actualmente en edición (null si modo crear)
   *
   * DIFERENCIA CON ACTIVITY-PANEL:
   * Este componente mantiene tanto editingId como selected por separado
   * para mayor claridad en las validaciones y condicionales.
   */
  readonly isEditing = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Gateway | null>(null);

  /**
   * SNAPSHOT LOCAL Y SUSCRIPCIÓN
   *
   * - gatewaySnapshot: copia de la última lista emitida por gateways$, necesaria
   *   para buscar gateways por id cuando cambia el @Input gatewayId
   * - gatewaySub: referencia a la suscripción para limpiarla en ngOnDestroy
   */
  private gatewaySnapshot: Gateway[] = [];
  private gatewaySub?: Subscription;

  /**
   * TIPOS DE GATEWAY DISPONIBLES
   *
   * Array de configuración para el selector de tipos en el formulario.
   * Cada tipo tiene:
   * - value: identificador interno usado en el modelo
   * - label: texto descriptivo mostrado al usuario
   *
   * SÍMBOLOS:
   * - (?): Decisión - evalúa condiciones y toma una ruta
   * - (+): Paralelo - divide en múltiples ramas que se ejecutan simultáneamente
   * - (X): Exclusivo - similar a decisión pero con semántica XOR
   */
  readonly gatewayTypes = [
    { value: 'decision-gateway', label: 'Decisión (?)' },
    { value: 'parallel-gateway', label: 'Paralelo (+)' },
    { value: 'exclusive-gateway', label: 'Exclusivo (X)' },
  ];

  /**
   * FORMULARIO REACTIVO
   *
   * Configurado con FormBuilder y validaciones sincrónicas.
   *
   * CAMPOS:
   * - type: string requerido, tipo de gateway (uno de gatewayTypes)
   * - processId: number | null opcional, referencia al proceso padre
   * - status: string requerido, estado del gateway (default 'active')
   *
   * NOTA SOBRE COORDENADAS:
   * Este formulario NO incluye x, y porque las coordenadas se gestionan
   * desde el canvas mediante drag & drop. Al crear, se asignan coordenadas
   * por defecto (300, 200) que el usuario puede ajustar visualmente.
   *
   * VALIDACIONES:
   * - type: requerido (Validators.required)
   * - processId: opcional pero si se proporciona debe ser >= 1 (Validators.min(1))
   * - status: requerido (Validators.required)
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

  /**
   * CICLO DE VIDA: INICIALIZACIÓN
   *
   * Se ejecuta una vez al crear el componente.
   *
   * COMPORTAMIENTO:
   * 1. Verifica que el stream gateways$ esté disponible
   * 2. Si existe, suscribe al stream
   * 3. Mantiene actualizado el snapshot local cada vez que el stream emite
   * 4. Llama a applyInputSelection() por si ya hay un gatewayId inicial
   * 5. Si no existe el stream, muestra advertencia en consola
   *
   * PROPÓSITO DEL SNAPSHOT:
   * El stream gateways$ es asíncrono, pero necesitamos acceso síncrono para
   * resolver el @Input gatewayId cuando cambia. El snapshot permite buscar
   * el gateway sin crear una cadena de observables anidados.
   *
   * MANEJO DE ERRORES:
   * Si el servicio no está correctamente configurado o no expone list$,
   * muestra un warning pero no lanza error para evitar romper la aplicación.
   */
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

  /**
   * CICLO DE VIDA: DETECCIÓN DE CAMBIOS EN INPUTS
   *
   * Se ejecuta cada vez que el padre modifica el @Input gatewayId.
   *
   * COMPORTAMIENTO:
   * Si detecta cambio en gatewayId, intenta cargar el gateway correspondiente
   * en el formulario (modo edición). Si gatewayId es null, vuelve a modo crear.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('gatewayId' in changes) this.applyInputSelection();
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
    this.gatewaySub?.unsubscribe();
  }

  /**
   * Aplica la selección basada en el @Input gatewayId.
   *
   * COMPORTAMIENTO:
   * 1. Si gatewayId es null:
   *    - Si estaba en modo edición (editingId no null), resetea el formulario
   *    - Si ya estaba en modo crear, no hace nada
   * 2. Si gatewayId tiene un valor:
   *    - Busca el gateway en el snapshot local
   *    - Si lo encuentra, llama a edit() para cargarlo en el formulario
   *    - Si no lo encuentra, no hace nada (puede que aún no esté en el snapshot)
   *
   * INVOCACIÓN:
   * - Llamado automáticamente en ngOnInit (por si hay gatewayId inicial)
   * - Llamado automáticamente en ngOnChanges (cuando cambia gatewayId)
   * - Llamado cada vez que el snapshot se actualiza (por si el gateway recién llegó)
   *
   * SINCRONIZACIÓN:
   * Este método resuelve el problema de sincronización entre el @Input (síncrono)
   * y el stream de gateways (asíncrono).
   */
  private applyInputSelection(): void {
    if (this.gatewayId == null) {
      if (this.editingId() != null) this.reset();
      return;
    }
    const found = this.gatewaySnapshot.find((g) => g.id === this.gatewayId);
    if (found) this.edit(found);
  }

  /**
   * Manejador del evento submit del formulario.
   *
   * VALIDACIÓN:
   * Si el formulario no es válido, aborta sin hacer nada.
   *
   * COMPORTAMIENTO:
   * - Si hay un gateway en edición (editingId() no es null), llama a update()
   * - Si no hay gateway en edición (editingId() es null), llama a create()
   *
   * DELEGACIÓN:
   * Este método no contiene lógica propia, solo decide a qué método delegar.
   * Es el punto de entrada único desde el template (ngSubmit)="submit()".
   */
  submit(): void {
    if (!this.form.valid) return;
    this.editingId() ? this.update() : this.create();
  }

  /**
   * Crea un nuevo gateway en el servicio y resetea el formulario.
   *
   * COMPORTAMIENTO:
   * 1. Obtiene los valores del formulario con getRawValue()
   * 2. Construye un payload Omit<Gateway, 'id'> (el id lo genera el backend)
   * 3. Asigna coordenadas por defecto x=300, y=200 (centrado aproximado)
   * 4. Establece status desde el formulario (default 'active')
   * 5. Convierte processId null a undefined para consistencia con el modelo
   * 6. Llama a service.create() con el payload
   * 7. Suscribe al Observable con callbacks de éxito/error
   * 8. En caso de éxito, resetea el formulario a modo crear
   * 9. En caso de error, muestra mensaje en consola
   *
   * COORDENADAS POR DEFECTO:
   * Los valores 300, 200 son un punto aproximadamente centrado en un canvas
   * típico de 600x400. El usuario puede ajustar la posición arrastrando el
   * gateway en el canvas después de crearlo.
   *
   * MANEJO DE ERRORES:
   * Los errores se registran en consola con el prefijo [GatewayPanel] para
   * facilitar debugging. En producción, podrían mostrarse notificaciones al usuario.
   *
   * RESETEO:
   * reset() limpia el formulario y vuelve a modo crear, listo para crear
   * otro gateway sin necesidad de cerrar/abrir el panel.
   */
  private create(): void {
    const raw = this.form.getRawValue();

    // Obtener processId del formulario o del proceso activo
    let processId: number | undefined = raw.processId ?? undefined;
    if (!processId) {
      const activeId = this.activeProcessService.getActiveProcessId();
      if (activeId) {
        processId = activeId;
      } else {
        console.error('No hay proceso activo');
        console.error('Solución: Selecciona o crea un proceso desde el menú "Procesos"');
        alert(
          'No hay un proceso activo seleccionado\n\n' +
          'Para crear gateways, primero debes:\n' +
          '1. Ir al menú "Procesos" (arriba)\n' +
          '2. Seleccionar un proceso existente\n' +
          '   O crear uno nuevo\n\n' +
          'Luego podrás crear gateways en el dashboard.'
        );
        return;
      }
    }

    const payload: Omit<Gateway, 'id'> = {
      type: raw.type!,
      x: 300,
      y: 200,
      status: raw.status!,
      processId: processId, // Ahora siempre tiene un valor
    };

    this.service.create(payload).subscribe({
      next: () => this.reset(),
      error: (err) => {
        console.error('[GatewayPanel] Error al crear:', err);
        console.error('Payload enviado:', payload);
        alert('Error al crear gateway. Verifica la consola para más detalles.');
      },
    });
  }

  /**
   * Carga un gateway en el formulario para editar.
   *
   * PARÁMETROS:
   * - item: Gateway completo (con id) a editar
   *
   * COMPORTAMIENTO:
   * 1. Activa el modo edición con isEditing.set(true)
   * 2. Guarda la referencia completa en selected
   * 3. Guarda el id en editingId para validaciones
   * 4. Resetea el formulario y carga los valores del gateway con reset()
   * 5. Convierte processId undefined a null para compatibilidad con FormControl
   *
   * NOTA SOBRE RESET VS PATCHVALUE:
   * Usa form.reset() en lugar de patchValue() porque reset() establece
   * todos los campos, mientras que patchValue() solo actualiza los proporcionados.
   * Esto garantiza que no queden valores residuales de ediciones anteriores.
   *
   * CAMPOS NO EDITABLES:
   * Las coordenadas x, y del gateway NO se cargan en el formulario porque
   * se gestionan desde el canvas. Solo se editan propiedades lógicas (type,
   * processId, status).
   *
   * INVOCACIÓN:
   * - Llamado por applyInputSelection() cuando el padre envía un gatewayId
   * - Puede ser llamado directamente desde el template (lista de gateways)
   *
   * EFECTO EN EL TEMPLATE:
   * Al cambiar isEditing, editingId y selected, el template reactivamente:
   * - Cambia el título del panel de "Nuevo Gateway" a "Editar Gateway"
   * - Cambia el botón submit de "Crear" a "Actualizar"
   * - Muestra el botón "Cancelar"
   */
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

  /**
   * Actualiza el gateway en edición con los valores del formulario.
   *
   * VALIDACIONES:
   * - Si no hay gateway seleccionado (selected() es null), aborta
   * - Si el gateway no tiene id, aborta (no se puede actualizar sin id)
   *
   * COMPORTAMIENTO:
   * 1. Obtiene el gateway actual de selected()
   * 2. Verifica que tenga id válido
   * 3. Obtiene los valores del formulario con getRawValue()
   * 4. Hace merge del gateway existente con los nuevos valores (spread operator)
   * 5. MANTIENE las coordenadas x, y del gateway original (no se editan desde el panel)
   * 6. Convierte processId null a undefined para consistencia
   * 7. Llama a service.update() con el objeto merged
   * 8. Suscribe al Observable con callbacks de éxito/error
   * 9. En caso de éxito, resetea el formulario a modo crear
   * 10. En caso de error, muestra mensaje en consola
   *
   * PRESERVACIÓN DE COORDENADAS:
   * El merge { ...current, ...campos } preserva x, y y otros campos que no
   * están en el formulario. Las coordenadas solo se actualizan mediante
   * service.move() desde el canvas drag & drop.
   *
   * MANEJO DE ERRORES:
   * Similar a create(), los errores se registran con prefijo identificable.
   *
   * RESETEO:
   * Después de actualizar, vuelve a modo crear. Esto permite al usuario
   * crear un nuevo gateway inmediatamente si lo desea.
   */
  private update(): void {
    const current = this.selected();
    if (!current || !current.id) return;

    const raw = this.form.getRawValue();

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

  /**
   * Elimina un gateway por su identificador.
   *
   * PARÁMETROS:
   * - id: Identificador del gateway a eliminar (puede ser undefined)
   *
   * VALIDACIÓN:
   * Si id es null o undefined, aborta sin hacer nada.
   *
   * CONFIRMACIÓN:
   * Muestra un diálogo de confirmación nativo con confirm().
   * Si el usuario cancela, aborta la operación.
   *
   * COMPORTAMIENTO:
   * 1. Valida que id no sea null/undefined
   * 2. Pide confirmación al usuario
   * 3. Si se está editando el gateway a eliminar, resetea el formulario primero
   * 4. Llama a service.delete() con el id
   * 5. Suscribe al Observable con callbacks de éxito/error
   * 6. En caso de éxito, no hace nada adicional (el store reactivo actualiza la lista)
   * 7. En caso de error, muestra mensaje en consola
   *
   * AUTO-LIMPIEZA PROACTIVA:
   * A diferencia de activity-panel que limpia después de eliminar, este
   * componente limpia ANTES para evitar referencia a un gateway que está
   * siendo eliminado.
   *
   * CONFIRMACIÓN DE USUARIO:
   * El confirm() es una medida de seguridad para prevenir eliminaciones
   * accidentales. En una aplicación más sofisticada, esto podría ser un
   * modal personalizado con mejor UX.
   *
   * INVOCACIÓN:
   * Típicamente llamado desde el template con el id de un item de la lista:
   * ```html
   * <button (click)="remove(gateway.id)">Eliminar</button>
   * ```
   */
  remove(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('¿Eliminar este gateway?')) return;

    if (this.editingId() === id) this.reset();

    this.service.delete(id).subscribe({
      next: () => {},
      error: (err) => console.error('[GatewayPanel] Error al eliminar:', err),
    });
  }

  /**
   * Cancela la edición actual y vuelve a modo crear.
   *
   * COMPORTAMIENTO:
   * Llama a reset() para limpiar el formulario y el estado.
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
    this.reset();
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
   * Este método intencionalmente NO llama a reset(). Si el usuario
   * cierra el panel y lo vuelve a abrir, verá el mismo estado. Para limpiar
   * el formulario, el Dashboard debería establecer gatewayId = null.
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
   * 3. Limpia el id en edición: editingId.set(null)
   * 4. Resetea todos los campos del formulario a sus valores por defecto
   *
   * VALORES POR DEFECTO:
   * - type: 'decision-gateway' (tipo más común)
   * - processId: null (sin asignación)
   * - status: 'active' (gateway habilitado)
   *
   * INVOCACIÓN INTERNA:
   * Llamado por:
   * - create() después de crear exitosamente
   * - update() después de actualizar exitosamente
   * - cancel() cuando el usuario cancela la edición
   * - remove() si se elimina el gateway en edición (antes de eliminar)
   * - applyInputSelection() si gatewayId cambia a null
   *
   * EFECTO EN EL TEMPLATE:
   * Al cambiar isEditing, editingId y selected, el template reactivamente
   * vuelve a mostrar el título "Nuevo Gateway" y el botón "Crear".
   */
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

  /**
   * Obtiene la etiqueta legible de un tipo de gateway.
   *
   * PARÁMETROS:
   * - type: Identificador interno del tipo (ej: 'decision-gateway')
   *
   * RETORNO:
   * - string: Etiqueta descriptiva (ej: 'Decisión (?)') si el tipo existe
   * - string: El type original si no se encuentra en gatewayTypes
   *
   * COMPORTAMIENTO:
   * 1. Busca el tipo en el array gatewayTypes
   * 2. Si lo encuentra, retorna su propiedad label
   * 3. Si no lo encuentra, retorna el type original como fallback
   *
   * USO TÍPICO:
   * El template usa este método para mostrar tipos legibles en la lista:
   * ```html
   * <span>{{ getGatewayLabel(gateway.type) }}</span>
   * ```
   *
   * EJEMPLO:
   * getGatewayLabel('decision-gateway') → 'Decisión (?)'
   * getGatewayLabel('parallel-gateway') → 'Paralelo (+)'
   * getGatewayLabel('unknown-type') → 'unknown-type'
   *
   * SEGURIDAD:
   * El fallback al type original previene errores si se agregan tipos
   * nuevos en el backend sin actualizar gatewayTypes en el frontend.
   */
  getGatewayLabel(type: string): string {
    const found = this.gatewayTypes.find(gt => gt.value === type);
    return found?.label ?? type;
  }

  /**
   * Función TrackBy para optimizar *ngFor en la lista de gateways.
   *
   * PARÁMETROS:
   * - _: índice del elemento (no usado)
   * - g: gateway actual en la iteración
   *
   * RETORNO:
   * - number: id del gateway si existe
   * - number: índice del elemento como fallback
   *
   * PROPÓSITO:
   * Angular usa trackBy para determinar qué elementos del DOM pueden reutilizarse
   * cuando cambia el array. Sin trackBy, Angular recrea todos los elementos en
   * cada cambio. Con trackBy por id, solo recrea los elementos que realmente
   * cambiaron o son nuevos.
   *
   * OPTIMIZACIÓN:
   * Cuando el store de gateways emite una nueva lista:
   * - CON trackBy: Angular compara ids y solo actualiza los cambios
   * - SIN trackBy: Angular destruye y recrea toda la lista
   *
   * USO TÍPICO:
   * ```html
   * <div *ngFor="let gateway of gateways$ | async; trackBy: trackById">
   *   {{ gateway.type }}
   * </div>
   * ```
   *
   * FALLBACK AL ÍNDICE:
   * Si un gateway no tiene id (caso raro, solo ocurre antes de persistir),
   * usa el índice como identificador temporal. Esto previene errores pero
   * es menos eficiente.
   */
  trackById = (_: number, g: Gateway) => g.id ?? _;
}
