// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Edge, EndpointKind } from '../models/Edge';

/**
 * EdgeService
 * 
 * Servicio que gestiona el estado y las operaciones CRUD de los edges (conexiones).
 * Los edges representan las flechas que conectan activities y gateways en el diagrama de flujo,
 * definiendo el orden de ejecución y las rutas del proceso.
 * 
 * ARQUITECTURA:
 * Implementa el mismo patrón híbrido que los demás servicios: BehaviorSubject como store
 * reactivo local con preparación para HTTP. Incluye lógica adicional de normalización
 * para mantener compatibilidad con diferentes formatos de datos.
 * 
 * SISTEMA DE ENDPOINTS TIPADOS:
 * Cada edge tiene dos endpoints (origen y destino) que pueden ser de tipo:
 * - 'activity': Conexión desde/hacia una actividad
 * - 'gateway': Conexión desde/hacia un gateway (decisión, paralelismo, etc.)
 * 
 * Estructura moderna (tipada):
 * - fromType: 'activity' | 'gateway'
 * - fromId: number (id de la activity o gateway de origen)
 * - toType: 'activity' | 'gateway'  
 * - toId: number (id de la activity o gateway de destino)
 * 
 * COMPATIBILIDAD LEGACY:
 * El sistema también soporta el formato antiguo donde solo existían conexiones
 * entre activities:
 * - activitySourceId: number (id de activity origen)
 * - activityDestinyId: number (id de activity destino)
 * 
 * El servicio normaliza automáticamente ambos formatos mediante el método compat(),
 * garantizando que todos los edges expuestos tengan ambos conjuntos de propiedades.
 * 
 * SOPORTE DE MÚLTIPLES CONEXIONES:
 * Un gateway o activity puede tener MÚLTIPLES edges entrantes y salientes sin límite.
 * Ejemplo de gateway de decisión con dos salidas:
 * 
 *   Gateway#1 ──[Condición A]──→ Activity#1
 *        └─────[Condición B]──→ Activity#2
 * 
 * Cada edge es independiente con su propio id, label y propiedades.
 * 
 * TIPOS DE CONEXIONES SOPORTADAS:
 * - Activity → Activity (flujo secuencial básico)
 * - Activity → Gateway (actividad que lleva a una bifurcación)
 * - Gateway → Activity (resultado de una condición o rama)
 * - Gateway → Gateway (encadenamiento de lógica de flujo)
 * 
 * ESTADO ACTUAL:
 * Funciona con tres edges mock que demuestran diferentes tipos de conexiones.
 * Las operaciones simulan latencia de red mediante delay().
 * 
 * MIGRACIÓN A BACKEND:
 * Proceso idéntico a ActivityService y GatewayService:
 * 1. Descomentar httpBaseUrl y ajustar URL del servidor
 * 2. Descomentar constructor con HttpClient
 * 3. Reemplazar métodos mock por métodos HTTP comentados al final
 * 4. Los componentes no requieren cambios
 */

/**
 * Tipo interno extendido que combina el modelo Edge con propiedades de compatibilidad.
 * 
 * PROPÓSITO:
 * Permite que el store maneje tanto edges en formato moderno (fromType/fromId/toType/toId)
 * como en formato legacy (activitySourceId/activityDestinyId) de manera transparente.
 * 
 * El método compat() se encarga de normalizar cualquier edge al formato completo antes
 * de exponerlo a los componentes, garantizando que siempre tengan acceso a ambos formatos.
 */
type EdgeCompat = Edge & {
  fromId?: number;
  toId?: number;
};

@Injectable({ providedIn: 'root' })
export class EdgeService {
  /**
   * URL base del backend Spring Boot para operaciones HTTP de edges.
   * Descomentar cuando se conecte con el backend real.
   */
  // private readonly httpBaseUrl = 'http://localhost:8080/api/edge';

  /**
   * Store interno que mantiene el estado actual de todos los edges.
   * 
   * DATOS MOCK:
   * Se inicializa con tres edges que demuestran diferentes escenarios:
   * 
   * 1. Edge#1 (formato legacy): Activity#1 → Activity#2
   *    Usa activitySourceId/activityDestinyId para compatibilidad con código antiguo.
   *    Representa un flujo secuencial básico entre dos actividades.
   * 
   * 2. Edge#2 (formato moderno): Gateway#1 → Activity#1 
   *    Usa fromType/fromId/toType/toId para conexión tipada.
   *    Representa una de las salidas de un gateway de decisión (Opción A).
   * 
   * 3. Edge#3 (formato moderno): Gateway#1 → Activity#2
   *    Segunda salida del mismo Gateway#1 hacia otra activity.
   *    Demuestra que un gateway puede tener múltiples conexiones salientes.
   * 
   * NORMALIZACIÓN:
   * Los edges en formato legacy se normalizan automáticamente al exponerse mediante list$,
   * agregando los campos fromType/fromId/toType/toId con valores derivados.
   * 
   * Los edges en formato moderno donde ambos extremos son activities también reciben
   * los campos legacy activitySourceId/activityDestinyId para máxima compatibilidad.
   */
  private readonly store = new BehaviorSubject<EdgeCompat[]>([
    // Ejemplo 1: Activity → Activity (legado)
    {
      id: 1,
      label: 'Flujo inicial',
      description: '',
      processId: 1,
      activitySourceId: 1,
      activityDestinyId: 2,
      status: 'active',
    },
    // Ejemplo 2: Gateway → Activity (múltiples salidas desde Gateway#1)
    {
      id: 2,
      label: 'Opción A',
      fromType: 'gateway',
      fromId: 1,
      toType: 'activity',
      toId: 1,
      status: 'active',
    },
    // Ejemplo 3: Gateway → Activity (segunda salida desde Gateway#1)
    {
      id: 3,
      label: 'Opción B',
      fromType: 'gateway',
      fromId: 1,
      toType: 'activity',
      toId: 2,
      status: 'active',
    },
  ]);

  /**
   * Stream crudo interno que expone el store sin transformaciones.
   * 
   * PROPÓSITO:
   * Base para construir el stream público list$ con normalización aplicada.
   * No debe usarse directamente por componentes externos.
   */
  private readonly raw$ = this.store.asObservable();

  /**
   * Stream público de solo lectura con normalización automática de edges.
   * 
   * NORMALIZACIÓN:
   * Cada edge que pasa por este stream es procesado por el método compat() que garantiza:
   * 
   * 1. Campos modernos siempre presentes:
   *    - fromType y toType: Se infieren como 'activity' si solo hay campos legacy
   *    - fromId y toId: Se copian desde activitySourceId/activityDestinyId si es necesario
   * 
   * 2. Campos legacy presentes cuando aplica:
   *    - activitySourceId y activityDestinyId: Se copian desde fromId/toId cuando
   *      ambos endpoints son de tipo 'activity'
   * 
   * 3. Compatibilidad bidireccional:
   *    - Edges antiguos funcionan con código nuevo
   *    - Edges nuevos funcionan con código antiguo
   *    - Sin necesidad de migración de datos
   * 
   * COMPONENTES SUSCRIPTORES:
   * - Dashboard: Obtiene edges para renderizar líneas SVG entre nodos
   * - EdgePanel: Muestra lista de edges y permite crear/eliminar
   * - Componentes de estadísticas: Analizan flujos y conexiones
   * 
   * USO:
   * Los componentes se suscriben y reciben actualizaciones automáticas cada vez
   * que se crea o elimina un edge en el store.
   */
  readonly list$: Observable<EdgeCompat[]> = this.raw$.pipe(
    map(list => list.map(e => this.compat(e)))
  );

  /**
   * Alias del stream principal para compatibilidad con código que usa nomenclatura items$.
   */
  readonly items$ = this.list$;
  
  /**
   * Constructor del servicio.
   * 
   * ESTADO ACTUAL (MOCK):
   * No recibe dependencias, opera en memoria.
   * 
   * ESTADO FUTURO (HTTP):
   * Descomentar inyección de HttpClient y cargar edges iniciales desde el servidor.
   */
  // constructor(private http: HttpClient) {}

  /**
   * MÉTODOS DE CONSULTA
   * 
   * Permiten obtener edges del store sin modificar el estado.
   */

  /**
   * Obtiene un edge específico por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador único del edge
   * 
   * RETORNO:
   * Observable que emite el edge encontrado (normalizado) o undefined si no existe.
   * 
   * NORMALIZACIÓN:
   * El edge retornado pasa por compat() automáticamente porque proviene de list$.
   * 
   * USO TÍPICO:
   * EdgePanel puede usar este método para cargar detalles de un edge específico.
   */
  get(id: number): Observable<EdgeCompat | undefined> {
    return this.list$.pipe(map(list => list.find(e => e.id === id)));
  }

  /**
   * MÉTODOS DE CREACIÓN
   * 
   * Permiten agregar nuevos edges al store con normalización automática y generación de IDs.
   */

  /**
   * Crea un nuevo edge y lo agrega al store.
   * 
   * PARÁMETROS:
   * - payload: Objeto con datos del edge en formato moderno o legacy, el id se genera automáticamente
   * 
   * RETORNO:
   * Observable que emite el edge creado normalizado con su id asignado.
   * 
   * COMPORTAMIENTO:
   * 1. Genera un nuevo id único basado en el máximo id existente + 1
   * 2. Aplica label por defecto 'Edge' si no se proporciona
   * 3. Detecta el formato del payload (legacy vs moderno):
   *    - Si tiene activitySourceId/activityDestinyId: formato legacy
   *    - Si tiene fromType/fromId/toType/toId: formato moderno
   * 4. Construye el edge con los campos apropiados según el formato detectado
   * 5. Normaliza el edge antes de agregarlo al store usando compat()
   * 6. Actualiza el store con inmutabilidad
   * 7. Simula latencia de 120ms
   * 
   * TOLERANCIA DE FORMATO:
   * El método acepta ambos formatos sin necesidad de conversión previa:
   * - Legacy: { activitySourceId: 1, activityDestinyId: 2, ... }
   * - Moderno: { fromType: 'gateway', fromId: 1, toType: 'activity', toId: 3, ... }
   * 
   * NORMALIZACIÓN:
   * El edge resultante tendrá AMBOS conjuntos de propiedades después de compat(),
   * garantizando compatibilidad con todo el código.
   * 
   * USO TÍPICO:
   * EdgePanel llama a este método cuando el usuario selecciona origen y destino
   * y envía el formulario de creación de conexión.
   */
  create(payload: Omit<Edge, 'id'>): Observable<EdgeCompat> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(e => e.id ?? 0)) + 1 : 1;

    const label = payload.label ?? 'Edge';

    // Resolver extremos con tolerancia (tipado o legado)
    const resolved = this.resolveEndpoints(payload);

    // Si ambos extremos son actividades, poblar también legado para compat
    const legacy = resolved.fromType === 'activity' && resolved.toType === 'activity'
      ? {
        activitySourceId: resolved.fromId,
        activityDestinyId: resolved.toId,
      }
      : {};

    const created: EdgeCompat = this.compat({
      id: nextId,
      label,
      processId: payload.processId,
      status: payload.status ?? 'active',
      ...legacy,
      // tipado
      fromType: resolved.fromType,
      fromId: resolved.fromId,
      toType: resolved.toType,
      toId: resolved.toId,
    });

    this.store.next([...current, created]);
    return of(created).pipe(delay(120));
  }

  add(payload: Omit<Edge, 'id'>) { return this.create(payload); }
  new(payload: Omit<Edge, 'id'>) { return this.create(payload); }

  /**
   * MÉTODOS DE ACTUALIZACIÓN
   * 
   * Permiten modificar edges existentes con normalización de endpoints.
   */

  /**
   * Actualiza un edge existente en el store.
   * 
   * PARÁMETROS:
   * - payload: Objeto Edge completo con el id del edge a actualizar
   * 
   * RETORNO:
   * Observable que emite el edge actualizado y normalizado. Si no hay id, emite
   * el payload sin modificar el store.
   * 
   * COMPORTAMIENTO:
   * 1. Valida presencia del id
   * 2. Si no hay id, emite advertencia y retorna sin modificar
   * 3. Si hay id, resuelve los endpoints para normalizar formato
   * 4. Si ambos endpoints son activities, genera campos legacy
   * 5. Mapea el array reemplazando el edge que coincide con el id
   * 6. Normaliza el edge actualizado con compat()
   * 7. Actualiza el store con el nuevo array
   * 8. Simula latencia de 100ms
   * 
   * NORMALIZACIÓN DE ENDPOINTS:
   * Usa resolveEndpoints() para detectar automáticamente si el payload viene en
   * formato legacy o moderno y normaliza a la estructura completa.
   * 
   * MERGE DE DATOS:
   * Combina el edge existente con los nuevos datos preservando propiedades
   * no especificadas en el payload.
   * 
   * USO TÍPICO:
   * EdgePanel podría usar este método para actualizar el label o descripción
   * de un edge existente (aunque actualmente no se implementa edición de edges).
   */
  update(payload: Edge): Observable<EdgeCompat> {
    if (payload.id == null) throw new Error('Edge inválido: falta id para actualizar.');

    const prev = this.store.value.find(e => e.id === payload.id) ?? { id: payload.id } as EdgeCompat;

    const resolved = this.resolveEndpoints({ ...prev, ...payload });

    const legacy = resolved.fromType === 'activity' && resolved.toType === 'activity'
      ? {
        activitySourceId: resolved.fromId,
        activityDestinyId: resolved.toId,
      }
      : {
        // si deja de ser A→A, limpiamos legado para no inducir a error visual
        activitySourceId: undefined,
        activityDestinyId: undefined,
      };

    const merged: EdgeCompat = this.compat({
      ...prev,
      ...payload,
      ...legacy,
      fromType: resolved.fromType,
      fromId: resolved.fromId,
      toType: resolved.toType,
      toId: resolved.toId,
    });

    const list = this.store.value.map(e => (e.id === payload.id ? merged : e));
    this.store.next(list);
    return of(merged).pipe(delay(100));
  }
  save(payload: Edge) { return this.update(payload); }
  put(payload: Edge)  { return this.update(payload); }
  set(payload: Edge)  { return this.update(payload); }

  /**
   * MÉTODOS DE ELIMINACIÓN
   * 
   * Permiten remover edges del store de forma permanente.
   */

  /**
   * Elimina un edge del store por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador único del edge a eliminar
   * 
   * RETORNO:
   * Observable que emite void al completarse la operación.
   * 
   * COMPORTAMIENTO:
   * 1. Filtra el array excluyendo el edge con el id especificado
   * 2. Actualiza el store con el array filtrado
   * 3. Simula latencia de 80ms
   * 
   * INMUTABILIDAD:
   * filter() crea un nuevo array sin mutar el original.
   * 
   * IDEMPOTENCIA:
   * Si el id no existe, no se elimina nada. Seguro de llamar múltiples veces.
   * 
   * USO TÍPICO:
   * EdgePanel llama a este método cuando el usuario hace clic en "Eliminar"
   * en una conexión de la lista.
   */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(e => e.id !== id));
    return of(void 0).pipe(delay(80));
  }

  remove(id: number) { return this.delete(id); }

  /**
   * MÉTODOS DE NORMALIZACIÓN Y UTILIDADES
   * 
   * Funciones internas que manejan la conversión entre formatos legacy y moderno,
   * garantizando compatibilidad bidireccional.
   */

  /**
   * Normaliza un edge para garantizar compatibilidad entre formatos legacy y moderno.
   * 
   * PARÁMETROS:
   * - e: Edge en cualquier formato (puede tener solo campos legacy, solo modernos, o ambos)
   * 
   * RETORNO:
   * EdgeCompat con todos los campos necesarios para ambos formatos.
   * 
   * COMPORTAMIENTO:
   * 1. Detecta qué campos están presentes en el edge original
   * 2. Si tiene campos modernos (fromType/fromId/toType/toId), los usa directamente
   * 3. Si solo tiene campos legacy (activitySourceId/activityDestinyId):
   *    - Asume que ambos endpoints son 'activity'
   *    - Copia los ids a fromId/toId
   *    - Establece fromType/toType como 'activity'
   * 4. Si tiene campos modernos y ambos endpoints son 'activity':
   *    - Copia fromId/toId a activitySourceId/activityDestinyId para compatibilidad
   * 5. Retorna el edge completo con todos los campos
   * 
   * CASOS DE USO:
   * - Edges del backend que vienen solo en formato legacy
   * - Edges del backend que vienen solo en formato moderno
   * - Edges creados localmente que necesitan ambos formatos
   * 
   * GARANTÍAS:
   * Después de pasar por compat(), un edge siempre tendrá:
   * - fromType, fromId, toType, toId (formato moderno)
   * - activitySourceId, activityDestinyId si corresponde (formato legacy cuando A→A)
   */
  private compat(e: EdgeCompat): EdgeCompat {
    const fromId = e.fromId ?? e.activitySourceId;
    const toId   = e.toId   ?? e.activityDestinyId;

    // inferir tipos si faltan y hay legado
    const fromType: EndpointKind | undefined =
      e.fromType ?? (e.activitySourceId != null ? 'activity' : undefined);
    const toType: EndpointKind | undefined =
      e.toType   ?? (e.activityDestinyId != null ? 'activity' : undefined);

    let out: EdgeCompat = { ...e, fromId, toId, fromType, toType };

    // si ambos son activities, asegura legado consistente
    if (fromType === 'activity' && toType === 'activity' && fromId != null && toId != null) {
      out = {
        ...out,
        activitySourceId: fromId,
        activityDestinyId: toId,
      };
    }

    return out;
  }

  /**
   * Resuelve los endpoints de un edge desde un payload mixto o incompleto.
   * 
   * PARÁMETROS:
   * - payload: Objeto que puede contener campos modernos (fromType/fromId/toType/toId),
   *            campos legacy (activitySourceId/activityDestinyId), o una mezcla de ambos
   * 
   * RETORNO:
   * Objeto con los cuatro campos normalizados:
   * - fromType: 'activity' o 'gateway'
   * - fromId: identificador del nodo origen
   * - toType: 'activity' o 'gateway'
   * - toId: identificador del nodo destino
   * 
   * COMPORTAMIENTO:
   * 1. Prioriza campos modernos si están presentes (fromType/fromId/toType/toId)
   * 2. Si fromId no existe, usa activitySourceId como fallback
   * 3. Si toId no existe, usa activityDestinyId como fallback
   * 4. Si fromType no existe pero activitySourceId sí, asume fromType = 'activity'
   * 5. Si toType no existe pero activityDestinyId sí, asume toType = 'activity'
   * 6. Si aún faltan tipos pero hay ids, asume 'activity' por defecto (compatibilidad legacy)
   * 7. Valida que los cuatro campos estén definidos, lanza error si alguno falta
   * 
   * VALIDACIÓN:
   * Si después de todos los fallbacks no se pueden resolver los cuatro campos,
   * lanza un error descriptivo. Esto previene creación de edges inválidos.
   * 
   * USO TÍPICO:
   * - Llamado internamente por create() y update() antes de construir el edge
   * - Permite que create() reciba payloads en cualquier formato
   * - Garantiza que el edge final siempre tenga estructura consistente
   * 
   * EJEMPLO:
   * resolveEndpoints({ activitySourceId: 1, activityDestinyId: 2 })
   * → { fromType: 'activity', fromId: 1, toType: 'activity', toId: 2 }
   */
  private resolveEndpoints(payload: Partial<EdgeCompat>): {
    fromType: EndpointKind;
    fromId: number;
    toType: EndpointKind;
    toId: number;
  } {
    // Preferir tipado si viene
    let fromType = payload.fromType as EndpointKind | undefined;
    let fromId   = payload.fromId ?? payload.activitySourceId;
    let toType   = payload.toType as EndpointKind | undefined;
    let toId     = payload.toId   ?? payload.activityDestinyId;

    // Fallback a 'activity' si solo hay legado
    if (!fromType && payload.activitySourceId != null) fromType = 'activity';
    if (!toType && payload.activityDestinyId != null) toType = 'activity';

    // Si aún faltan tipos pero hay ids, por compat asumimos 'activity'
    if (!fromType && fromId != null) fromType = 'activity';
    if (!toType && toId != null) toType = 'activity';

    if (fromType == null || toType == null || fromId == null || toId == null) {
      throw new Error('Edge inválido: extremos incompletos (from/to).');
    }

    return { fromType, fromId, toType, toId };
  }

  /**
   * MÉTODOS HTTP PARA INTEGRACIÓN CON BACKEND
   * 
   * Esta sección contiene las implementaciones comentadas que se activarán
   * cuando el servicio se conecte al backend Spring Boot.
   * 
   * ESTRATEGIA DE ACTIVACIÓN:
   * 1. Descomentar el bloque completo
   * 2. Renombrar los métodos actuales create/update/delete a createMock/updateMock/deleteMock
   * 3. Renombrar createEdgeHTTP/updateEdgeHTTP/deleteEdgeHTTP a create/update/delete
   * 4. Configurar httpBaseUrl con la URL del backend (ej: 'http://localhost:8080/api/edge')
   * 5. Los componentes seguirán funcionando sin cambios
   * 
   * FORMATO DE DATOS:
   * El backend debe aceptar y devolver edges con la siguiente estructura:
   * {
   *   id: number (generado por backend),
   *   label: string,
   *   description: string,
   *   processId: number,
   *   status: 'active' | 'inactive',
   *   fromType: 'activity' | 'gateway',
   *   fromId: number,
   *   toType: 'activity' | 'gateway',
   *   toId: number,
   *   activitySourceId?: number (opcional, solo si fromType === 'activity'),
   *   activityDestinyId?: number (opcional, solo si toType === 'activity')
   * }
   * 
   * COMPATIBILIDAD LEGACY:
   * - Si el backend solo entiende activitySourceId/activityDestinyId,
   *   los métodos HTTP automáticamente incluyen esos campos cuando fromType y toType son 'activity'
   * - Si el backend devuelve solo campos legacy, compat() los normaliza a formato moderno
   * - Si el backend ya soporta campos tipados, funcionan directamente
   * 
   * SINCRONIZACIÓN:
   * Todos los métodos usan tap() para actualizar el store local después de
   * operaciones exitosas, manteniendo la UI reactiva sin necesidad de recargas.
   */

  /*
  // ========================================
  // CREAR EDGE CON HTTP
  // ========================================
  
  /**
   * Crea un nuevo edge en el backend y actualiza el store local.
   * 
   * ENDPOINT: POST /api/edge
   * 
   * PARÁMETROS:
   * - payload: Datos del edge sin id (será generado por el backend)
   * 
   * RETORNO:
   * Observable que emite el edge creado con su id asignado.
   * 
   * COMPORTAMIENTO:
   * 1. Resuelve endpoints usando resolveEndpoints() para normalizar el formato
   * 2. Construye el objeto a enviar con campos modernos (fromType/fromId/toType/toId)
   * 3. Si es conexión A→A, agrega campos legacy (activitySourceId/activityDestinyId)
   * 4. Envía POST al backend
   * 5. Al recibir respuesta, normaliza con compat() y agrega al store local
   * 6. Emite el edge creado al componente
   * 
   * COMPATIBILIDAD:
   * Acepta payloads en formato moderno, legacy o mixto gracias a resolveEndpoints().
   */
  /*
  createEdgeHTTP(payload: Omit<Edge, 'id'>): Observable<Edge> {
    const resolved = this.resolveEndpoints(payload);

    const toSend: Omit<Edge, 'id'> = {
      label: payload.label ?? '',
      description: payload.description ?? '',
      processId: payload.processId,
      status: payload.status || 'active',
      fromType: resolved.fromType,
      fromId: resolved.fromId,
      toType: resolved.toType,
      toId: resolved.toId,
    };

    // Si es A→A, agregar campos legacy para compatibilidad con backend viejo
    if (resolved.fromType === 'activity' && resolved.toType === 'activity') {
      (toSend as any).activitySourceId = resolved.fromId;
      (toSend as any).activityDestinyId = resolved.toId;
    }

    return this.http.post<Edge>(this.httpBaseUrl, toSend).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, this.compat(created)]);
      })
    );
  }

  // ========================================
  // ACTUALIZAR EDGE CON HTTP
  // ========================================
  
  /**
   * Actualiza un edge existente en el backend y sincroniza el store local.
   * 
   * ENDPOINT: PUT /api/edge
   * 
   * PARÁMETROS:
   * - payload: Edge completo con id para actualizar
   * 
   * RETORNO:
   * Observable que emite el edge actualizado.
   * 
   * COMPORTAMIENTO:
   * 1. Valida que el payload tenga id
   * 2. Resuelve endpoints para normalizar formato
   * 3. Construye objeto con campos modernos
   * 4. Si es A→A, agrega campos legacy; si no, los elimina
   * 5. Envía PUT al backend
   * 6. Al recibir respuesta, busca el edge en el store por id
   * 7. Reemplaza el edge antiguo con el actualizado (inmutabilidad)
   * 8. Emite el edge actualizado al componente
   * 
   * LIMPIEZA DE CAMPOS:
   * Si la conexión NO es A→A, elimina activitySourceId/activityDestinyId
   * para evitar inconsistencias cuando un edge pasa de A→A a G→A por ejemplo.
   */
  /*
  updateEdgeHTTP(payload: Edge): Observable<Edge> {
    if (payload.id == null) throw new Error('Edge inválido: falta id para actualizar.');

    const resolved = this.resolveEndpoints(payload);

    const toSend: Edge = {
      ...payload,
      fromType: resolved.fromType,
      fromId: resolved.fromId,
      toType: resolved.toType,
      toId: resolved.toId,
    };

    // Si es A→A, agregar campos legacy
    if (resolved.fromType === 'activity' && resolved.toType === 'activity') {
      (toSend as any).activitySourceId = resolved.fromId;
      (toSend as any).activityDestinyId = resolved.toId;
    } else {
      // Si NO es A→A, limpiar campos legacy
      (toSend as any).activitySourceId = undefined;
      (toSend as any).activityDestinyId = undefined;
    }

    return this.http.put<Edge>(this.httpBaseUrl, toSend).pipe(
      tap(updated => {
        const current = this.store.value;
        const index = current.findIndex(e => e.id === payload.id);
        
        if (index !== -1) {
          const newList = [...current];
          newList[index] = this.compat(updated);
          this.store.next(newList);
        }
      })
    );
  }

  // ========================================
  // LISTAR EDGES CON HTTP
  // ========================================
  
  /**
   * Obtiene todos los edges del backend y reemplaza el store local.
   * 
   * ENDPOINT: GET /api/edge
   * 
   * RETORNO:
   * Observable que emite el array de edges normalizado.
   * 
   * COMPORTAMIENTO:
   * 1. Envía GET al backend para obtener todos los edges
   * 2. Normaliza cada edge con compat() para garantizar formato consistente
   * 3. Reemplaza completamente el store con la lista del backend
   * 4. Emite el array normalizado al componente
   * 
   * USO TÍPICO:
   * Llamado al iniciar la aplicación o al cambiar de proceso para cargar
   * las conexiones correspondientes.
   */
  /*
  getAllEdgesHTTP(): Observable<Edge[]> {
    return this.http.get<Edge[]>(this.httpBaseUrl).pipe(
      tap(edges => this.store.next(edges.map(e => this.compat(e))))
    );
  }

  // ========================================
  // OBTENER EDGE POR ID CON HTTP
  // ========================================
  
  /**
   * Obtiene un edge específico del backend por su identificador.
   * 
   * ENDPOINT: GET /api/edge/{id}
   * 
   * PARÁMETROS:
   * - id: Identificador del edge a buscar
   * 
   * RETORNO:
   * Observable que emite el edge encontrado.
   * 
   * NOTA:
   * Este método NO actualiza el store automáticamente. Es útil para
   * verificaciones o consultas puntuales sin afectar el estado global.
   */
  /*
  getEdgeById(id: number): Observable<Edge> {
    return this.http.get<Edge>(`${this.httpBaseUrl}/${id}`);
  }

  // ========================================
  // ELIMINAR EDGE CON HTTP
  // ========================================
  
  /**
   * Elimina un edge del backend y del store local.
   * 
   * ENDPOINT: DELETE /api/edge/{id}
   * 
   * PARÁMETROS:
   * - id: Identificador del edge a eliminar
   * 
   * RETORNO:
   * Observable que emite void al completarse la eliminación.
   * 
   * COMPORTAMIENTO:
   * 1. Envía DELETE al backend con el id del edge
   * 2. Al recibir confirmación, filtra el edge del store local
   * 3. Emite void para indicar finalización exitosa
   * 
   * INMUTABILIDAD:
   * Usa filter() para crear un nuevo array sin el edge eliminado,
   * respetando los principios de inmutabilidad de Angular.
   */
  /*
  deleteEdgeHTTP(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(e => e.id !== id));
      })
    );
  }
  */
}
