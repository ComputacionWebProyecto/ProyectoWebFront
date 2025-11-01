// src/app/services/gateway.service.ts
import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Gateway } from '../models/Gateway';

/**
 * GatewayService
 * 
 * Servicio que gestiona el estado y las operaciones CRUD de los gateways (Gateway).
 * Los gateways son elementos de flujo (decisiones, paralelismos, convergencias) que
 * permiten bifurcar y unir el flujo de actividades en el diagrama de proceso.
 * 
 * ARQUITECTURA:
 * Implementa el mismo patrón híbrido que ActivityService: un BehaviorSubject como store
 * reactivo local combinado con preparación para integración HTTP. Los componentes se
 * suscriben al stream público y reciben actualizaciones automáticas cuando el estado cambia.
 * 
 * TIPOS DE GATEWAY SOPORTADOS:
 * - decision-gateway: Bifurcación basada en condiciones (diamante con "?")
 * - parallel-gateway: Ejecución paralela de múltiples ramas (diamante con "+")
 * - convergence-gateway: Convergencia de múltiples ramas (diamante con círculo)
 * 
 * CONEXIONES MÚLTIPLES:
 * Un gateway puede tener múltiples edges de entrada y salida. Por ejemplo, un gateway
 * de decisión puede tener dos o más edges salientes que representan diferentes condiciones
 * (ej: "Condición A", "Condición B"). El sistema no impone límites en el número de conexiones.
 * 
 * ESTADO ACTUAL:
 * Funciona con un gateway mock en memoria para desarrollo frontend independiente.
 * Las operaciones simulan latencia de red mediante delay().
 * 
 * MIGRACIÓN A BACKEND:
 * El proceso es idéntico al de ActivityService:
 * 1. Descomentar httpBaseUrl y ajustar la URL del servidor
 * 2. Descomentar constructor con HttpClient
 * 3. Reemplazar métodos mock por métodos HTTP comentados al final
 * 4. Los componentes no requieren cambios
 */
@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  /**
   * URL base del backend Spring Boot para operaciones HTTP de gateways.
   * Descomentar cuando se conecte con el backend real.
   */
  // private readonly httpBaseUrl = 'http://localhost:8080/api/gateway';

  /**
   * Store interno que mantiene el estado actual de todos los gateways.
   * 
   * Se inicializa con un gateway mock de tipo decisión que permite demostrar
   * inmediatamente la funcionalidad de bifurcación de flujo en el dashboard.
   * 
   * El gateway mock incluye:
   * - id: 1 (identificador único)
   * - type: 'decision-gateway' (tipo de gateway para determinar el símbolo visual)
   * - x, y: Coordenadas para posicionamiento en el canvas
   * - status: 'active' (estado del gateway, permite filtrado)
   * 
   * Este gateway puede conectarse con múltiples activities mediante edges, demostrando
   * el flujo de decisión donde diferentes condiciones llevan a diferentes actividades.
   */
  private readonly store = new BehaviorSubject<Gateway[]>([
    // Mock inicial: Gateway de decisión que se conecta a múltiples nodos
    { 
      id: 1, 
      type: 'decision-gateway', 
      x: 300, 
      y: 250, 
      status: 'active' 
    },
  ]);

  /**
   * Stream público de solo lectura que expone el estado del store a los componentes.
   * 
   * Los componentes suscriptores son:
   * - Dashboard: Renderiza los gateways en el canvas como diamantes con símbolos específicos
   * - GatewayPanel: Muestra la lista de gateways y permite crear/editar/eliminar
   * - EdgePanel: Pobla los selectores de origen/destino con gateways además de activities
   * 
   * Cada vez que se crea, modifica o elimina un gateway, todos los suscriptores reciben
   * el array completo actualizado y Angular re-renderiza solo lo necesario.
   */
  readonly list$ = this.store.asObservable();

  /**
   * Alias del stream principal para compatibilidad con código que usa nomenclatura items$.
   */
  readonly items$ = this.list$;

  /**
   * Constructor del servicio.
   * 
   * ESTADO ACTUAL (MOCK):
   * No recibe dependencias, opera completamente en memoria.
   * 
   * ESTADO FUTURO (HTTP):
   * Descomentar inyección de HttpClient y cargar gateways iniciales desde el servidor.
   */
  // constructor(private http: HttpClient) {}

  /**
   * MÉTODOS DE CONSULTA
   * 
   * Permiten obtener gateways del store sin modificar el estado.
   * Mantienen consistencia con el patrón reactivo retornando Observables.
   */

  /**
   * Obtiene todos los gateways como Observable.
   * Retorna el stream list$ que emite el array completo cada vez que cambia.
   */
  list(): Observable<Gateway[]> { 
    return this.list$; 
  }
  
  getAll(): Observable<Gateway[]> { 
    return this.list$; 
  }
  
  getGateways(): Observable<Gateway[]> { 
    return this.list$; 
  }

  /**
   * Obtiene un gateway específico por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador único del gateway
   * 
   * RETORNO:
   * Observable que emite el gateway encontrado o undefined si no existe.
   * 
   * USO TÍPICO:
   * GatewayPanel usa este método cuando recibe un @Input con el id de un gateway
   * que debe cargar para edición.
   */
  get(id: number): Observable<Gateway | undefined> {
    return this.list$.pipe(map(list => list.find(g => g.id === id)));
  }

  getGatewayById(id: number): Observable<Gateway | undefined> {
    return this.get(id);
  }

  /**
   * MÉTODOS DE CREACIÓN
   * 
   * Permiten agregar nuevos gateways al store con generación automática de IDs
   * y aplicación de valores por defecto seguros.
   */

  /**
   * Crea un nuevo gateway y lo agrega al store.
   * 
   * PARÁMETROS:
   * - payload: Objeto con datos del gateway, el id se genera automáticamente
   * 
   * RETORNO:
   * Observable que emite el gateway creado con su id asignado.
   * 
   * COMPORTAMIENTO:
   * 1. Genera un nuevo id único basado en el máximo id existente + 1
   * 2. Aplica valores por defecto:
   *    - type: 'decision-gateway' si no se especifica
   *    - x: 300 (posición horizontal por defecto)
   *    - y: 200 (posición vertical por defecto)
   *    - status: 'active' (estado activo por defecto)
   * 3. Actualiza el store con inmutabilidad usando spread operator
   * 4. Simula latencia de red de 100ms
   * 
   * INMUTABILIDAD:
   * El spread operator crea un nuevo array sin mutar el existente, esencial para
   * la detección de cambios de Angular.
   * 
   * USO TÍPICO:
   * GatewayPanel llama a este método cuando el usuario completa el formulario de creación.
   * Dashboard también puede llamarlo al añadir un gateway mediante drag & drop.
   */
  create(payload: Omit<Gateway, 'id'>): Observable<Gateway> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(g => g.id ?? 0)) + 1 : 1;

    const created: Gateway = {
      id: nextId,
      type: payload.type || 'decision-gateway',
      x: payload.x ?? 300,
      y: payload.y ?? 200,
      status: payload.status || 'active',
      processId: payload.processId,
    };

    this.store.next([...current, created]);
    return of(created).pipe(delay(100));
  }

  createGateway(gateway: Gateway): Observable<Gateway> {
    return this.create(gateway);
  }

  /**
   * MÉTODOS DE ACTUALIZACIÓN
   * 
   * Permiten modificar gateways existentes preservando datos no modificados.
   */

  /**
   * Actualiza un gateway existente en el store.
   * 
   * PARÁMETROS:
   * - updated: Objeto Gateway completo con el id del gateway a actualizar
   * 
   * RETORNO:
   * Observable que emite el gateway actualizado. Si el id no existe, emite el
   * payload sin modificar el store y registra una advertencia.
   * 
   * COMPORTAMIENTO:
   * 1. Busca el índice del gateway con el id proporcionado
   * 2. Si no se encuentra (index === -1), registra advertencia y retorna sin modificar
   * 3. Si se encuentra, crea un nuevo array copiando el actual
   * 4. Reemplaza el gateway en ese índice con un merge del existente y el nuevo
   * 5. Actualiza el store con el nuevo array
   * 6. Simula latencia de 100ms
   * 
   * MERGE DE DATOS:
   * {...current[index], ...updated} combina el gateway existente con los nuevos datos,
   * preservando propiedades no especificadas en updated.
   * 
   * USO TÍPICO:
   * - GatewayPanel: cuando el usuario edita y guarda cambios en un gateway
   * - Dashboard: cuando el usuario arrastra un gateway actualizando coordenadas x,y
   */
  update(updated: Gateway): Observable<Gateway> {
    const current = this.store.value;
    const index = current.findIndex(g => g.id === updated.id);
    
    if (index === -1) {
      console.warn(`[GatewayService] Gateway id=${updated.id} no encontrado`);
      return of(updated).pipe(delay(100));
    }

    const newList = [...current];
    newList[index] = { ...current[index], ...updated };
    this.store.next(newList);
    
    return of(newList[index]).pipe(delay(100));
  }

  updateGateway(id: number, gateway: Gateway): Observable<Gateway> {
    return this.update({ ...gateway, id });
  }

  /**
   * Actualiza únicamente las coordenadas x,y de un gateway.
   * 
   * PARÁMETROS:
   * - id: Identificador del gateway a mover
   * - x: Nueva posición horizontal en píxeles
   * - y: Nueva posición vertical en píxeles
   * 
   * RETORNO:
   * Observable que emite el gateway con coordenadas actualizadas, o undefined si no existe.
   * 
   * PROPÓSITO:
   * Método de conveniencia para Dashboard cuando el usuario arrastra un gateway.
   * Evita recuperar todo el gateway solo para cambiar x e y.
   * 
   * IMPLEMENTACIÓN:
   * Busca el gateway por id y si existe, llama a update() con las nuevas coordenadas.
   */
  move(id: number, x: number, y: number): Observable<Gateway | undefined> {
    const g = this.store.value.find(g => g.id === id);
    if (!g) return of(undefined).pipe(delay(60));
    return this.update({ ...g, x, y });
  }

  /**
   * MÉTODOS DE ELIMINACIÓN
   * 
   * Permiten remover gateways del store de forma permanente.
   */

  /**
   * Elimina un gateway del store por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador único del gateway a eliminar
   * 
   * RETORNO:
   * Observable que emite void al completarse la operación.
   * 
   * COMPORTAMIENTO:
   * 1. Filtra el array excluyendo el gateway con el id especificado
   * 2. Actualiza el store con el array filtrado
   * 3. Simula latencia de 100ms
   * 
   * INMUTABILIDAD:
   * filter() crea un nuevo array, nunca muta el original.
   * 
   * IDEMPOTENCIA:
   * Si el id no existe, simplemente no se elimina nada. Seguro de llamar múltiples veces.
   * 
   * USO TÍPICO:
   * GatewayPanel llama a este método cuando el usuario hace clic en "Eliminar" después
   * de confirmar la acción en un diálogo.
   */
  delete(id: number): Observable<void> {
    const current = this.store.value;
    this.store.next(current.filter(g => g.id !== id));
    return of(void 0).pipe(delay(100));
  }

  deleteGateway(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * MÉTODOS AUXILIARES
   * 
   * Utilidades para acceso directo al estado sin Observable.
   */

  /**
   * Obtiene snapshot sincrónico del estado actual del store.
   * 
   * RETORNO:
   * Array de gateways en el estado actual, sin envolver en Observable.
   * 
   * USO TÍPICO:
   * Cuando se necesita el estado actual de forma síncrona, por ejemplo para
   * operaciones internas que no requieren reactividad.
   * 
   * ADVERTENCIA:
   * Este método no notifica cambios posteriores. Para reactividad, usar list$.
   */
  getCurrentSnapshot(): Gateway[] {
    return this.store.value;
  }

  /**
   * MÉTODOS HTTP PARA INTEGRACIÓN CON BACKEND
   * 
   * Los siguientes métodos están preparados para conectar con el backend Spring Boot.
   * Actualmente comentados porque el servicio opera con datos mock.
   * 
   * PROCESO DE MIGRACIÓN:
   * 1. Verificar que el backend esté levantado y accesible
   * 2. Descomentar httpBaseUrl al inicio de la clase
   * 3. Ajustar la URL según configuración del servidor
   * 4. Descomentar el constructor con HttpClient
   * 5. Agregar carga inicial desde servidor en constructor
   * 6. Comentar métodos mock (create, update, delete)
   * 7. Descomentar estos métodos HTTP
   * 8. Opcionalmente renombrar quitando sufijo HTTP
   * 
   * SINCRONIZACIÓN:
   * Todos usan tap() para actualizar el store local después del éxito en el servidor.
   * Esto mantiene la UI reactiva y sincronizada sin recargas completas.
   * 
   * ENDPOINTS ESPERADOS:
   * - POST   /api/gateway           - Crear gateway
   * - PUT    /api/gateway           - Actualizar gateway
   * - GET    /api/gateway           - Listar todos
   * - GET    /api/gateway/{id}      - Obtener uno
   * - DELETE /api/gateway/{id}      - Eliminar
   */

  /*
  getGatewaysHTTP(): Observable<Gateway[]> {
    return this.http.get<Gateway[]>(this.httpBaseUrl).pipe(
      tap(gateways => this.store.next(gateways))
    );
  }

  createGatewayHTTP(gateway: Gateway): Observable<Gateway> {
    return this.http.post<Gateway>(this.httpBaseUrl, gateway).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, created]);
      })
    );
  }

  updateGatewayHTTP(id: number, gateway: Gateway): Observable<Gateway> {
    return this.http.put<Gateway>(`${this.httpBaseUrl}/${id}`, gateway).pipe(
      tap(updated => {
        const current = this.store.value;
        const index = current.findIndex(g => g.id === id);
        if (index !== -1) {
          const newList = [...current];
          newList[index] = updated;
          this.store.next(newList);
        }
      })
    );
  }

  deleteGatewayHTTP(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(g => g.id !== id));
      })
    );
  }
  */
}
