/**
 * EDGE PANEL COMPONENT
 *
 * Panel lateral para la gestión CRUD de edges (conexiones/aristas) entre nodos
 * del proceso de negocio. Permite crear y eliminar conexiones entre actividades
 * y gateways mediante selectores mixtos y validaciones de endpoints.
 *
 * ARQUITECTURA:
 * Este componente sigue un patrón simplificado comparado con activity-panel y
 * gateway-panel:
 * - MODO CREAR: Selectores mixtos para elegir origen y destino (únicamente)
 * - NO HAY MODO EDITAR: Los edges solo se pueden crear y eliminar, no modificar
 *
 * RAZÓN DE NO EDICIÓN:
 * En el modelo de procesos BPMN, cambiar los endpoints de una conexión equivale
 * a crear una nueva conexión y eliminar la anterior. Por simplicidad, el panel
 * solo permite crear conexiones nuevas.
 *
 * COMUNICACIÓN CON EL PADRE (Dashboard):
 * - INPUT edgeId: Actualmente no se usa en modo edición, pero se mantiene para
 *   consistencia con otros paneles y posible extensión futura
 * - OUTPUT close: El panel emite este evento para que el Dashboard lo oculte
 *
 * GESTIÓN DE ESTADO:
 * - Signals: editingId (number | null), selected (Edge | null) - mantenidos pero
 *   no usados activamente en modo edición por diseño
 * - FormGroup reactivo con validaciones sincrónicas y cruzadas
 * - Tres snapshots: edges, activities y gateways para resolver ids y poblar selects
 *
 * CICLO DE VIDA:
 * - ngOnInit: Triple suscripción a streams de edges, activities y gateways
 * - ngOnChanges: Detecta cambios en edgeId (para posible extensión futura)
 * - ngOnDestroy: Limpia tres suscripciones para prevenir memory leaks
 *
 * FORMULARIO DUAL: TYPED + LEGACY:
 * El formulario mantiene campos en dos formatos por compatibilidad:
 *
 * FORMATO MODERNO (TYPED):
 * - fromType: 'activity' | 'gateway' (tipo del nodo origen)
 * - fromId: number (id del nodo origen)
 * - toType: 'activity' | 'gateway' (tipo del nodo destino)
 * - toId: number (id del nodo destino)
 *
 * FORMATO LEGACY (PARA COMPATIBILIDAD):
 * - activitySourceId: number | null (solo si fromType === 'activity')
 * - activityDestinyId: number | null (solo si toType === 'activity')
 *
 * CAMPOS ADICIONALES:
 * - label: string requerido (etiqueta de la conexión)
 * - processId: number | null opcional (proceso al que pertenece)
 *
 * VALIDACIONES:
 * - fromType, toType: requeridos
 * - fromId, toId: requeridos, mínimo 1
 * - label: requerido, mínimo 1 caracter
 * - processId: opcional, mínimo 1 si se proporciona
 * - Validación cruzada: origen y destino no pueden ser el mismo nodo
 *
 * SELECTORES MIXTOS:
 * Los selectores de origen/destino muestran activities y gateways mezclados
 * en optgroups:
 * ```html
 * <select (change)="onSelectFromKindId($event)">
 *   <optgroup label="[A] Actividades">
 *     <option value="activity:1">Activity 1</option>
 *   </optgroup>
 *   <optgroup label="[G] Gateways">
 *     <option value="gateway:5">Gateway 5</option>
 *   </optgroup>
 * </select>
 * ```
 *
 * FORMATO DE VALUES:
 * Los options usan formato "tipo:id" (ej: "activity:12", "gateway:7") que
 * se parsea en onSelectFromKindId/onSelectToKindId para poblar múltiples
 * campos del formulario simultáneamente.
 *
 * INTEGRACIÓN CON EDGESERVICE:
 * El componente llama a create() y delete() del servicio.
 * Usa duck typing (as any) para manejar la dualidad Observable/void durante
 * la transición mock → backend HTTP.
 *
 * COMPATIBILIDAD AUTOMÁTICA:
 * Al crear un edge A→A (activity to activity), el componente automáticamente
 * puebla los campos legacy activitySourceId/activityDestinyId para garantizar
 * compatibilidad con código que aún use el formato antiguo.
 *
 * DIFERENCIAS CON OTROS PANELES:
 * - No tiene modo edición activo
 * - Triple suscripción (edges + activities + gateways)
 * - Selectores mixtos en lugar de selectores simples
 * - Validación cruzada personalizada (endpointsDifferentValidator)
 * - Manejo especial de campos legacy según tipo de conexión
 * - Logs de debugging más verbosos (útil por complejidad de selects mixtos)
 *
 * USO TÍPICO:
 * ```html
 * <app-edge-panel
 *   [edgeId]="null"
 *   (close)="hideEdgePanel()"
 * />
 * ```
 */

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
  /**
   * INPUT: edgeId
   *
   * Identificador del edge a editar. Actualmente no se usa para edición
   * porque el diseño del panel solo permite crear y eliminar edges.
   *
   * Se mantiene por:
   * - Consistencia con activity-panel y gateway-panel
   * - Posible extensión futura para permitir edición de labels/properties
   * - Compatibilidad con infraestructura del Dashboard
   */
  @Input() edgeId: number | null = null;

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
   * Este componente necesita cuatro servicios:
   * - FormBuilder: Constructor de formularios reactivos
   * - EdgeService: Servicio de gestión de edges (conexiones)
   * - ActivityService: Servicio de gestión de actividades (para poblar selects)
   * - GatewayService: Servicio de gestión de gateways (para poblar selects)
   * - ChangeDetectorRef: Forzar detección de cambios en operaciones asíncronas
   *
   * TRIPLE DEPENDENCIA:
   * A diferencia de activity-panel y gateway-panel que solo necesitan su
   * propio servicio, edge-panel necesita tres servicios porque debe mostrar
   * listas de activities y gateways en los selectores mixtos.
   */
  private fb = inject(FormBuilder);
  private edgeService = inject(EdgeService);
  private activityService = inject(ActivityService);
  private gatewayService = inject(GatewayService);
  private cdr = inject(ChangeDetectorRef);

  /**
   * STREAM DE EDGES REACTIVO
   *
   * Observable que emite la lista completa de edges cada vez que cambia el store.
   *
   * FALLBACKS MÚLTIPLES:
   * Usa duck typing con múltiples intentos para encontrar el stream correcto:
   * - list$: nombre estándar usado en activity/gateway services
   * - items$: nombre alternativo que podría usar EdgeService
   *
   * PROPÓSITO:
   * Mantener la lista de edges actualizada para mostrar en el panel y detectar
   * cuando se crea/elimina un edge.
   */
  readonly edges$: Observable<Edge[]> =
    (this.edgeService as any).list$ ?? (this.edgeService as any).items$;

  /**
   * STREAM DE ACTIVITIES REACTIVO
   *
   * Observable que emite la lista de activities para poblar los selectores.
   *
   * FALLBACKS MÚLTIPLES:
   * - list$: stream reactivo (preferido)
   * - items$: stream alternativo
   * - getAll(): método HTTP que retorna Observable
   * - list(): método que retorna Observable
   * - of([]): último recurso - emite array vacío
   *
   * PROPÓSITO:
   * Poblar los optgroups de [A] Actividades en los selectores de origen/destino.
   */
  readonly activities$: Observable<Activity[]> = (() => {
    const svc: any = this.activityService;
    const stream = svc.list$ ?? svc.items$ ?? svc.getAll?.() ?? svc.list?.();

    if (!stream) {
      console.error('[EdgePanel] ❌ No se encontró stream de Activities. Servicio:', svc);
      console.error('[EdgePanel] Propiedades disponibles:', Object.keys(svc));
    }

    return stream ?? this.activityService.list();
  })();

  /**
   * STREAM DE GATEWAYS REACTIVO
   *
   * Observable que emite la lista de gateways para poblar los selectores.
   *
   * FALLBACKS MÚLTIPLES + ÚLTIMO RECURSO:
   * - list$: stream reactivo (preferido)
   * - items$: stream alternativo
   * - getAll(): método HTTP que retorna Observable
   * - list(): método que retorna Observable
   * - getGateways(): método específico del GatewayService como último recurso
   *
   * PROPÓSITO:
   * Poblar los optgroups de [G] Gateways en los selectores de origen/destino.
   *
   * NOTA:
   * Tiene más fallbacks que activities$ porque la implementación de
   * GatewayService puede variar más según la evolución del código.
   */
  readonly gateways$: Observable<Gateway[]> =
    (this.gatewayService as any).list$ ??
    (this.gatewayService as any).items$ ??
    (this.gatewayService as any).getAll?.() ??
    (this.gatewayService as any).list?.() ??
    this.gatewayService.getGateways();

  /**
   * ESTADO LOCAL CON SIGNALS
   *
   * - editingId: id del edge en "edición" (actualmente no usado)
   * - selected: edge seleccionado (actualmente no usado)
   *
   * NOTA SOBRE NO USO:
   * Estas signals se mantienen por consistencia con otros paneles y para
   * facilitar una posible implementación futura de edición de edges.
   * Actualmente el panel solo crea y elimina, no edita.
   */
  readonly editingId = signal<number | null>(null);
  readonly selected = signal<Edge | null>(null);

  /**
   * SNAPSHOTS LOCALES Y SUSCRIPCIONES
   *
   * SNAPSHOTS:
   * - edgeSnapshot: copia local de la lista de edges
   * - activitiesSnapshot: copia local de activities (para poblar selects)
   * - gatewaysSnapshot: copia local de gateways (para poblar selects)
   *
   * SUSCRIPCIONES:
   * - edgesSub: suscripción a edges$
   * - actsSub: suscripción a activities$
   * - gwsSub: suscripción a gateways$
   *
   * PROPÓSITO DE TRIPLE SNAPSHOT:
   * 1. edgeSnapshot: resolver edgeId cuando cambia (para extensión futura)
   * 2. activitiesSnapshot: acceso síncrono para construir options de selects
   * 3. gatewaysSnapshot: acceso síncrono para construir options de selects
   *
   * VISIBILIDAD:
   * activitiesSnapshot y gatewaysSnapshot son públicos porque el template
   * los usa directamente en *ngFor para construir los selects.
   */
  private edgeSnapshot: Edge[] = [];
  private edgesSub?: Subscription;
  private actsSub?: Subscription;
  private gwsSub?: Subscription;

  activitiesSnapshot: Activity[] = [];
  gatewaysSnapshot: Gateway[] = [];

  /**
   * FORMULARIO REACTIVO DUAL (TYPED + LEGACY)
   *
   * Configurado con FormBuilder, validaciones sincrónicas y validación cruzada.
   *
   * CAMPOS MODERNOS (TYPED):
   * - fromType: EndpointKind | null (requerido) - 'activity' o 'gateway'
   * - fromId: number | null (requerido, min 1) - id del nodo origen
   * - toType: EndpointKind | null (requerido) - 'activity' o 'gateway'
   * - toId: number | null (requerido, min 1) - id del nodo destino
   *
   * CAMPOS LEGACY (COMPATIBILIDAD):
   * - activitySourceId: number | null (opcional, min 1) - se llena si fromType === 'activity'
   * - activityDestinyId: number | null (opcional, min 1) - se llena si toType === 'activity'
   *
   * CAMPOS ADICIONALES:
   * - label: string (requerido, min 1) - etiqueta de la conexión
   * - processId: number | null (opcional, min 1) - proceso al que pertenece
   *
   * VALIDACIÓN CRUZADA:
   * El formulario tiene un validador a nivel de grupo (endpointsDifferentValidator)
   * que verifica que (fromType, fromId) !== (toType, toId) para prevenir
   * auto-conexiones (un nodo conectado consigo mismo).
   *
   * POBLACIÓN AUTOMÁTICA:
   * Los handlers onSelectFromKindId/onSelectToKindId se encargan de poblar
   * simultáneamente los campos typed y legacy cuando el usuario selecciona
   * en los selects mixtos.
   *
   * EJEMPLO DE FLUJO:
   * 1. Usuario selecciona "activity:5" en selector origen
   * 2. onSelectFromKindId parsea → fromType='activity', fromId=5
   * 3. También llena activitySourceId=5 para compatibilidad
   * 4. form.updateValueAndValidity() ejecuta validación cruzada
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

  /**
   * CICLO DE VIDA: INICIALIZACIÓN
   *
   * Se ejecuta una vez al crear el componente.
   *
   * COMPORTAMIENTO:
   * 1. Suscribe a edges$ para mantener edgeSnapshot actualizado
   * 2. Suscribe a activities$ para mantener activitiesSnapshot actualizado
   * 3. Suscribe a gateways$ para mantener gatewaysSnapshot actualizado
   * 4. Cada suscripción verifica existencia del stream antes de suscribir
   * 5. Muestra warnings en consola si falta algún stream
   * 6. Logs de debug muestran cantidad de items recibidos
   * 7. Llama a cdr.detectChanges() después de actualizar gatewaysSnapshot
   *
   * PROPÓSITO DE TRIPLE SUSCRIPCIÓN:
   * Este componente necesita tres streams porque debe mostrar:
   * - Lista de edges existentes (para mostrar en panel)
   * - Lista de activities disponibles (para poblar selects)
   * - Lista de gateways disponibles (para poblar selects)
   *
   * LOGS DE DEBUGGING:
   * Los console.log se mantienen porque los selectores mixtos son complejos
   * y es útil ver cuántos items se reciben de cada tipo durante desarrollo.
   *
   * CHANGE DETECTION:
   * Se llama explícitamente a detectChanges() después de actualizar
   * gatewaysSnapshot porque en algunos casos Angular no detecta automáticamente
   * los cambios en arrays públicos usados por *ngFor.
   *
   * MANEJO DE ERRORES:
   * Si algún stream no existe, muestra warning pero continúa funcionando.
   * El panel seguirá operativo aunque algún select quede vacío.
   */
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
        if (this.activitiesSnapshot.length === 0) {
          console.warn('[EdgePanel] No hay activities en el snapshot. ¿Backend retorna vacío?');
        }
        this.cdr.detectChanges();
      });
    } else {
      console.error('[EdgePanel] No encontré stream de activities para selects.');
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

  /**
   * CICLO DE VIDA: DETECCIÓN DE CAMBIOS EN INPUTS
   *
   * Se ejecuta cada vez que el padre modifica el @Input edgeId.
   *
   * COMPORTAMIENTO:
   * Si detecta cambio en edgeId, llama a applyInputSelection().
   *
   * NOTA:
   * Actualmente no se usa para edición, pero se mantiene para consistencia
   * y posible extensión futura.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('edgeId' in changes) this.applyInputSelection();
  }

  /**
   * CICLO DE VIDA: LIMPIEZA
   *
   * Se ejecuta al destruir el componente.
   *
   * COMPORTAMIENTO:
   * Cancela las tres suscripciones (edges, activities, gateways) para
   * prevenir memory leaks.
   *
   * IMPORTANCIA:
   * Este componente tiene triple suscripción, por lo que es crítico
   * limpiar todas. Un leak aquí consume tres veces más recursos que
   * en otros paneles.
   */
  ngOnDestroy(): void {
    this.edgesSub?.unsubscribe();
    this.actsSub?.unsubscribe();
    this.gwsSub?.unsubscribe();
  }

  /**
   * Validador cruzado para impedir auto-conexiones.
   *
   * RETORNO:
   * Factory function que retorna el validador real.
   *
   * VALIDADOR INTERNO:
   * Recibe el FormGroup completo y valida que (fromType, fromId) sea
   * diferente de (toType, toId).
   *
   * COMPORTAMIENTO:
   * 1. Extrae fromType, fromId, toType, toId del formulario
   * 2. Si todos los campos están completos, compara (type, id)
   * 3. Si ambos endpoints son iguales, retorna { sameEndpoint: true }
   * 4. Si son diferentes o faltan campos, retorna null (válido)
   *
   * PROPÓSITO:
   * Prevenir que un usuario cree una conexión de un nodo consigo mismo,
   * lo cual no tiene sentido en un proceso BPMN.
   *
   * EJEMPLO DE ERROR:
   * fromType='activity', fromId=5, toType='activity', toId=5 → INVÁLIDO
   * fromType='activity', fromId=5, toType='activity', toId=7 → VÁLIDO
   * fromType='activity', fromId=5, toType='gateway', toId=5 → VÁLIDO (diferentes tipos)
   *
   * INVOCACIÓN:
   * Se ejecuta automáticamente cada vez que cambia algún campo del formulario
   * o cuando se llama explícitamente a updateValueAndValidity().
   */
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

  /**
   * Getter para acceder al error de auto-conexión.
   *
   * RETORNO:
   * - true: si el formulario tiene el error sameEndpoint
   * - false: si no hay error o el error no existe
   *
   * USO TÍPICO:
   * El template usa este getter para mostrar mensajes de error:
   * ```html
   * <div *ngIf="sameEndpointError" class="error">
   *   No puedes conectar un nodo consigo mismo
   * </div>
   * ```
   *
   * SEGURIDAD:
   * Usa doble negación (!!) para convertir el valor a boolean,
   * previniendo valores undefined/null que podrían causar problemas en el template.
   */
  get sameEndpointError(): boolean {
    const e = this.form.errors as any;
    return !!(e && e['sameEndpoint']);
  }

  /**
   * Alias legacy para sameEndpointError.
   *
   * RETORNO:
   * Mismo valor que sameEndpointError.
   *
   * PROPÓSITO:
   * Mantener compatibilidad con HTML que podría usar el nombre antiguo
   * sameActivityError (de cuando solo soportaba conexiones A→A).
   *
   * DEPRECACIÓN:
   * Este getter debería eventualmente eliminarse cuando todo el HTML
   * use sameEndpointError.
   */
  get sameActivityError(): boolean {
    return this.sameEndpointError;
  }

  /**
   * Función TrackBy para optimizar *ngFor de activities.
   *
   * PARÁMETROS:
   * - _: índice (no usado)
   * - a: activity en iteración
   *
   * RETORNO:
   * id de la activity o índice como fallback.
   *
   * PROPÓSITO:
   * Optimizar renderizado de options en selects de activities.
   */
  trackByAct = (_: number, a: Activity) => a.id ?? _;

  /**
   * Función TrackBy para optimizar *ngFor de gateways.
   *
   * PARÁMETROS:
   * - _: índice (no usado)
   * - g: gateway en iteración
   *
   * RETORNO:
   * id del gateway o índice como fallback.
   *
   * PROPÓSITO:
   * Optimizar renderizado de options en selects de gateways.
   */
  trackByGw = (_: number, g: Gateway) => g.id ?? _;

  /**
   * Función TrackBy para optimizar *ngFor de edges.
   *
   * PARÁMETROS:
   * - _: índice (no usado)
   * - e: edge en iteración
   *
   * RETORNO:
   * id del edge o índice como fallback.
   *
   * PROPÓSITO:
   * Optimizar renderizado de lista de edges en el panel.
   */
  trackById = (_: number, e: Edge) => e.id ?? _;

  /**
   * Handler para el selector de nodo origen (FROM).
   *
   * PARÁMETROS:
   * - e: Evento del select element
   *
   * COMPORTAMIENTO:
   * 1. Extrae el value del select (formato "tipo:id", ej: "activity:12")
   * 2. Si está vacío, aborta
   * 3. Parsea el string dividiéndolo por ':' → [kind, idStr]
   * 4. Convierte idStr a number
   * 5. Actualiza fromType y fromId en el formulario
   * 6. Si kind === 'activity', también llena activitySourceId (compatibilidad legacy)
   * 7. Si kind === 'gateway', activitySourceId queda null
   * 8. Llama a updateValueAndValidity() para ejecutar validación cruzada
   *
   * FORMATO DEL VALUE:
   * Los options del select usan formato "tipo:id":
   * - "activity:5" → fromType='activity', fromId=5, activitySourceId=5
   * - "gateway:7" → fromType='gateway', fromId=7, activitySourceId=null
   *
   * VALIDACIÓN:
   * Verifica que el id sea finito (Number.isFinite) antes de asignarlo.
   * Si el parsing falla, asigna null.
   *
   * INVOCACIÓN:
   * Llamado desde el template con (change)="onSelectFromKindId($event)".
   *
   * EFECTO EN VALIDACIÓN:
   * updateValueAndValidity() ejecuta el validador cruzado que verifica
   * que origen y destino no sean el mismo nodo.
   */
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

  /**
   * Handler para el selector de nodo destino (TO).
   *
   * PARÁMETROS:
   * - e: Evento del select element
   *
   * COMPORTAMIENTO:
   * 1. Extrae el value del select (formato "tipo:id", ej: "gateway:2")
   * 2. Si está vacío, aborta
   * 3. Parsea el string dividiéndolo por ':' → [kind, idStr]
   * 4. Convierte idStr a number
   * 5. Actualiza toType y toId en el formulario
   * 6. Si kind === 'activity', también llena activityDestinyId (compatibilidad legacy)
   * 7. Si kind === 'gateway', activityDestinyId queda null
   * 8. Llama a updateValueAndValidity() para ejecutar validación cruzada
   *
   * FORMATO DEL VALUE:
   * Los options del select usan formato "tipo:id":
   * - "activity:8" → toType='activity', toId=8, activityDestinyId=8
   * - "gateway:3" → toType='gateway', toId=3, activityDestinyId=null
   *
   * VALIDACIÓN:
   * Verifica que el id sea finito (Number.isFinite) antes de asignarlo.
   * Si el parsing falla, asigna null.
   *
   * INVOCACIÓN:
   * Llamado desde el template con (change)="onSelectToKindId($event)".
   *
   * SIMETRÍA CON onSelectFromKindId:
   * Este método es simétrico a onSelectFromKindId pero maneja el endpoint
   * destino (TO) en lugar del origen (FROM).
   */
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

  /**
   * Aplica la selección basada en el @Input edgeId.
   *
   * COMPORTAMIENTO:
   * 1. Si edgeId es null:
   *    - Si había un edge en "edición", resetea el formulario
   *    - Si ya estaba limpio, no hace nada
   * 2. Si edgeId tiene un valor:
   *    - Busca el edge en el snapshot local
   *    - Si lo encuentra, llama a edit() (aunque actualmente no se usa edición)
   *
   * NOTA SOBRE NO USO:
   * Actualmente este método está implementado pero no se usa activamente
   * porque el panel no soporta edición de edges. Se mantiene para:
   * - Consistencia con otros paneles
   * - Posible extensión futura
   * - Evitar errores si el Dashboard envía un edgeId
   *
   * INVOCACIÓN:
   * - Llamado en ngOnInit (por si hay edgeId inicial)
   * - Llamado en ngOnChanges (cuando cambia edgeId)
   * - Llamado cada vez que se actualiza edgeSnapshot
   */
  private applyInputSelection(): void {
    if (this.edgeId == null) {
      if (this.editingId() != null) this.reset();
      return;
    }
    const found = this.edgeSnapshot.find((e) => e.id === this.edgeId);
    if (found) this.edit(found);
  }

  /**
   * Manejador del evento submit del formulario.
   *
   * VALIDACIÓN:
   * Si el formulario no es válido, aborta sin hacer nada.
   *
   * COMPORTAMIENTO:
   * - Si hay editingId (modo edición teórico), llama a update()
   * - Si no hay editingId (modo crear), llama a create()
   *
   * NOTA SOBRE EDICIÓN:
   * Aunque la lógica soporta update, el diseño actual del panel solo
   * permite crear edges, no editarlos. La bifurcación se mantiene por
   * consistencia y extensibilidad.
   *
   * INVOCACIÓN:
   * Llamado desde el template con (ngSubmit)="submit()".
   */
  submit(): void {
    if (!this.form.valid) return;
    this.editingId() ? this.update() : this.create();
  }

  /**
   * Crea un nuevo edge con formato typed + compatibilidad legacy.
   *
   * VALIDACIONES:
   * - Verifica que fromType, toType, fromId, toId estén definidos
   * - Si falta algún campo requerido, aborta sin hacer nada
   *
   * COMPORTAMIENTO:
   * 1. Extrae valores del formulario con destructuring
   * 2. Valida que los campos typed estén completos
   * 3. Construye payload Omit<Edge, 'id'> con campos modernos
   * 4. Convierte processId null a undefined para consistencia
   * 5. Establece status='active' por defecto
   * 6. Si es conexión A→A, agrega campos legacy (activitySourceId/activityDestinyId)
   * 7. Si no es A→A, los campos legacy no se agregan (quedan undefined)
   * 8. Llama a edgeService.create() con el payload
   * 9. Usa duck typing para manejar Observable/void
   * 10. Si retorna Observable, suscribe y resetea al éxito
   * 11. Si retorna void, ejecuta directamente y resetea
   *
   * COMPATIBILIDAD AUTOMÁTICA:
   * El código detecta si es una conexión activity→activity y automáticamente
   * puebla activitySourceId y activityDestinyId para que código legacy que
   * solo lea esos campos siga funcionando.
   *
   * EJEMPLO DE PAYLOAD A→A:
   * ```typescript
   * {
   *   fromType: 'activity',
   *   fromId: 5,
   *   toType: 'activity',
   *   toId: 8,
   *   activitySourceId: 5,      // agregado automáticamente
   *   activityDestinyId: 8,     // agregado automáticamente
   *   label: 'Flujo normal',
   *   status: 'active',
   *   processId: 1
   * }
   * ```
   *
   * EJEMPLO DE PAYLOAD A→G:
   * ```typescript
   * {
   *   fromType: 'activity',
   *   fromId: 5,
   *   toType: 'gateway',
   *   toId: 2,
   *   // NO tiene activitySourceId ni activityDestinyId
   *   label: 'A decisión',
   *   status: 'active',
   *   processId: 1
   * }
   * ```
   *
   * DUCK TYPING:
   * Usa (as any) porque durante la transición mock → HTTP, create()
   * puede retornar void o Observable<Edge>. Este patrón permite ambos.
   *
   * RESETEO:
   * reset() limpia el formulario después de crear, listo para crear
   * otro edge sin cerrar el panel.
   */
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

  /**
   * Carga un edge en el formulario para editar (modo teórico).
   *
   * PARÁMETROS:
   * - item: Edge completo a "editar"
   *
   * COMPORTAMIENTO:
   * 1. Guarda referencia en selected signal
   * 2. Guarda id en editingId signal
   * 3. Infiere fromType desde item.fromType o asume 'activity' si tiene activitySourceId
   * 4. Infiere toType desde item.toType o asume 'activity' si tiene activityDestinyId
   * 5. Infiere fromId desde item.fromId o cae back a activitySourceId
   * 6. Infiere toId desde item.toId o cae back a activityDestinyId
   * 7. Si aún falta tipo pero hay id, asume 'activity' por compatibilidad
   * 8. Resetea y carga todos los campos en el formulario
   *
   * INFERENCIA MULTI-NIVEL:
   * Este método implementa lógica compleja de inferencia para manejar edges
   * que pueden venir en formato moderno (typed), legacy, o mixto:
   * - Formato moderno: tiene fromType/fromId/toType/toId
   * - Formato legacy: tiene solo activitySourceId/activityDestinyId
   * - Formato mixto: combinación de ambos
   *
   * EJEMPLO DE INFERENCIA:
   * Edge legacy: { activitySourceId: 5, activityDestinyId: 8 }
   * → fromType='activity', fromId=5, toType='activity', toId=8
   *
   * Edge moderno: { fromType='gateway', fromId=2, toType='activity', toId=7 }
   * → Usa directamente los valores typed
   *
   * NOTA SOBRE NO USO:
   * Aunque está implementado, este método actualmente no se usa porque
   * el panel no permite editar edges. Se mantiene por consistencia y
   * extensibilidad futura.
   *
   * INVOCACIÓN POTENCIAL:
   * Sería llamado por applyInputSelection() si el Dashboard enviara un edgeId,
   * pero el flujo actual no hace esto porque no hay UI para editar edges.
   */
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

  /**
   * Actualiza el edge en "edición" (modo teórico).
   *
   * VALIDACIONES:
   * - Verifica que haya un edge seleccionado
   * - Verifica que fromType, toType, fromId, toId estén definidos
   *
   * COMPORTAMIENTO:
   * 1. Obtiene el edge actual de selected()
   * 2. Extrae valores del formulario
   * 3. Valida que los campos typed estén completos
   * 4. Hace merge del edge existente con los nuevos valores
   * 5. Convierte processId null a undefined
   * 6. Si es A→A, agrega/actualiza campos legacy
   * 7. Si NO es A→A, elimina campos legacy (undefined)
   * 8. Llama a edgeService.update() con el objeto merged
   * 9. Usa duck typing para manejar Observable/void
   * 10. Resetea el formulario después de actualizar
   *
   * LIMPIEZA DE CAMPOS LEGACY:
   * Importante: si un edge cambia de A→A a A→G (por ejemplo), este método
   * explícitamente establece activitySourceId y activityDestinyId como
   * undefined para limpiarlos y evitar inconsistencias.
   *
   * EJEMPLO DE ACTUALIZACIÓN A→A:
   * ```typescript
   * // Antes: activity:5 → activity:8
   * // Después: activity:5 → activity:10
   * {
   *   ...edgeExistente,
   *   toId: 10,
   *   activityDestinyId: 10  // actualizado
   * }
   * ```
   *
   * EJEMPLO DE ACTUALIZACIÓN A→A a A→G:
   * ```typescript
   * // Antes: activity:5 → activity:8
   * // Después: activity:5 → gateway:2
   * {
   *   ...edgeExistente,
   *   toType: 'gateway',
   *   toId: 2,
   *   activityDestinyId: undefined  // limpiado
   * }
   * ```
   *
   * NOTA SOBRE NO USO:
   * Este método está implementado pero no se usa activamente porque el
   * diseño del panel no permite editar edges. Se mantiene por consistencia.
   *
   * DUCK TYPING:
   * Mismo patrón que create() para manejar Observable/void.
   */
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

  /**
   * Elimina un edge por su identificador.
   *
   * PARÁMETROS:
   * - id: Identificador del edge a eliminar (puede ser undefined)
   *
   * VALIDACIÓN:
   * Si id es null o undefined, aborta sin hacer nada.
   *
   * COMPORTAMIENTO:
   * 1. Valida que id no sea null/undefined
   * 2. Si el edge a eliminar está en "edición", resetea el formulario primero
   * 3. Llama a edgeService.delete() con el id
   * 4. Usa duck typing para manejar Observable/void
   * 5. Si retorna Observable, suscribe (sin callback necesario)
   * 6. Si retorna void, ejecuta directamente
   *
   * AUTO-LIMPIEZA PROACTIVA:
   * Similar a gateway-panel, limpia antes de eliminar para evitar referencias
   * a un edge que está siendo eliminado.
   *
   * NOTA:
   * A diferencia de activity-panel y gateway-panel, este método NO pide
   * confirmación con confirm(). Los edges se consideran más fáciles de
   * recrear que activities/gateways, por lo que la UX permite eliminación directa.
   *
   * INVOCACIÓN:
   * Típicamente llamado desde el template con el id de un item de la lista:
   * ```html
   * <button (click)="remove(edge.id)">Eliminar</button>
   * ```
   *
   * DUCK TYPING:
   * Mismo patrón que create() y update() para manejar Observable/void.
   */
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

  /**
   * Cancela la edición actual y vuelve a modo crear.
   *
   * COMPORTAMIENTO:
   * Llama a reset() para limpiar el formulario y el estado.
   *
   * NOTA:
   * Aunque el panel no soporta edición activa, este método se mantiene
   * por consistencia con otros paneles y para limpiar el formulario manualmente.
   *
   * INVOCACIÓN POTENCIAL:
   * ```html
   * <button (click)="cancel()">Limpiar</button>
   * ```
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
   * cierra el panel y lo vuelve a abrir, verá el mismo estado.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Resetea el formulario a su estado inicial (modo crear).
   *
   * COMPORTAMIENTO:
   * 1. Limpia la selección: selected.set(null)
   * 2. Limpia el id en edición: editingId.set(null)
   * 3. Resetea todos los campos del formulario a null o string vacío
   *
   * VALORES POR DEFECTO:
   * - Todos los campos numéricos: null
   * - label: string vacío ''
   * - Los selects quedarán sin selección
   *
   * INVOCACIÓN INTERNA:
   * Llamado por:
   * - create() después de crear exitosamente
   * - update() después de actualizar (si se usara)
   * - cancel() cuando el usuario limpia el formulario
   * - remove() si se elimina el edge en "edición"
   * - applyInputSelection() si edgeId cambia a null
   *
   * EFECTO EN SELECTORES:
   * Al resetear, los selects mixtos volverán a mostrar el placeholder
   * "Seleccionar origen/destino", listo para crear un nuevo edge.
   *
   * LIMPIEZA COMPLETA:
   * Resetea tanto campos typed como legacy, asegurando que no queden
   * valores residuales de creaciones anteriores.
   */
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
