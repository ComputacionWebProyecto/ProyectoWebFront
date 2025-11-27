// src/app/services/gateway.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Gateway } from '../models/Gateway';

/**
 * Servicio que gestiona el estado y las operaciones CRUD de los gateways.
 * Los gateways son elementos de flujo que permiten bifurcar y unir el flujo de
 * actividades en el diagrama de proceso mediante decisiones, paralelismos o convergencias.
 *
 * Este servicio implementa el patrón de cache reactivo local combinado con integración
 * HTTP al backend Spring Boot. Utiliza un BehaviorSubject como store centralizado que
 * mantiene el estado actual de todos los gateways. Los componentes se suscriben al
 * stream público y reciben actualizaciones automáticas cuando el estado cambia.
 *
 * Tipos de gateway soportados:
 * - decision-gateway: Bifurcación basada en condiciones, representado con "?"
 * - parallel-gateway: Ejecución paralela de múltiples ramas, representado con "+"
 * - exclusive-gateway: Selección exclusiva de una rama, representado con "X"
 * - convergence-gateway: Convergencia de múltiples ramas, representado con círculo
 *
 * Los gateways pueden tener múltiples conexiones de entrada y salida. Por ejemplo,
 * un gateway de decisión puede tener dos o más edges salientes que representan
 * diferentes condiciones. El sistema no impone límites en el número de conexiones.
 *
 * Flujo de operaciones:
 * 1. Constructor carga gateways iniciales desde el backend
 * 2. Operaciones CRUD se ejecutan contra el backend vía HTTP
 * 3. Respuestas exitosas actualizan el store local mediante tap()
 * 4. Componentes suscritos a list$ reciben el nuevo estado automáticamente
 * 5. Angular re-renderiza solo los elementos que cambiaron
 */
@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  /**
   * URL base del backend Spring Boot para operaciones HTTP de gateways.
   * Se utiliza el path relativo /api/gateway que el proxy de Angular redirige
   * automáticamente a http://localhost:8080/api/gateway durante el desarrollo.
   */
  private readonly httpBaseUrl = 'http://localhost:8080/api/gateway';

  /**
   * Store interno que mantiene el estado actual de todos los gateways.
   *
   * Se inicializa vacío y se llena automáticamente en el constructor mediante
   * la carga desde el backend. Este BehaviorSubject actúa como cache local
   * reactivo que permite a los componentes acceder al estado actual sin necesidad
   * de hacer requests HTTP redundantes.
   *
   * El store se actualiza automáticamente después de cada operación CRUD exitosa
   * mediante el operador tap() en los métodos HTTP, manteniendo sincronización
   * constante entre frontend y backend.
   */
  private readonly store = new BehaviorSubject<Gateway[]>([]);

  /**
   * Stream público de solo lectura que expone el estado del store a los componentes.
   *
   * Este Observable emite el array completo de gateways cada vez que el store cambia,
   * permitiendo que los componentes reaccionen automáticamente a las actualizaciones.
   *
   * Componentes que se suscriben:
   * - Dashboard: Renderiza los gateways en el canvas como diamantes con símbolos específicos
   * - GatewayPanel: Muestra la lista de gateways y permite crear, editar y eliminar
   * - EdgePanel: Incluye gateways en los selectores de origen y destino para conexiones
   *
   * Cada vez que se crea, modifica o elimina un gateway mediante los métodos del servicio,
   * el store se actualiza automáticamente y todos los suscriptores reciben el nuevo estado.
   * Angular optimiza el renderizado y solo actualiza los elementos que realmente cambiaron.
   */
  readonly list$ = this.store.asObservable();

  /**
   * Alias del stream principal para compatibilidad con código que usa nomenclatura items$.
   */
  readonly items$ = this.list$;

  /**
   * Constructor del servicio. Inyecta HttpClient para realizar operaciones HTTP
   * contra el backend Spring Boot y ejecuta la carga inicial de gateways.
   *
   * La carga inicial se realiza automáticamente al instanciar el servicio,
   * poblando el store con todos los gateways existentes en la base de datos.
   * Esto permite que los componentes tengan acceso inmediato a los datos
   * cuando se suscriben al stream list$.
   */
  constructor(private http: HttpClient) {
    this.loadFromBackend();
  }

  /**
   * Métodos de consulta que permiten obtener gateways del store sin modificar el estado.
   * Todos retornan Observables para mantener consistencia con el patrón reactivo.
   */

  /**
   * Obtiene todos los gateways como Observable del stream principal.
   * Este método retorna el stream list$ que emite el array completo cada vez
   * que el store cambia, permitiendo reactividad en los componentes.
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
   * Este método busca en el stream list$ y retorna el primer gateway que coincida
   * con el id proporcionado. Si no encuentra ninguna coincidencia, emite undefined.
   *
   * El Observable emitirá actualizaciones automáticamente si el gateway cambia
   * en el store, por ejemplo, si se actualiza su posición o tipo.
   *
   * Caso de uso típico: GatewayPanel carga un gateway específico para edición
   * cuando recibe un id como parámetro de entrada.
   */
  get(id: number): Observable<Gateway | undefined> {
    return this.list$.pipe(map(list => list.find(g => g.id === id)));
  }

  getGatewayById(id: number): Observable<Gateway | undefined> {
    return this.get(id);
  }

  /**
   * Métodos de creación que permiten agregar nuevos gateways al sistema.
   * Los gateways se envían al backend para persistencia y el store local
   * se actualiza automáticamente con la respuesta.
   */

  /**
   * Crea un nuevo gateway en el backend y actualiza el store local.
   *
   * Este método envía una petición POST al backend con los datos del gateway.
   * El backend genera automáticamente el id y retorna el gateway completo con
   * todas sus propiedades, incluyendo relaciones anidadas si corresponde.
   *
   * Después de crear exitosamente el gateway en el backend, el método actualiza
   * el store local agregando el nuevo gateway al array existente. Esto dispara
   * una emisión del stream list$ y todos los componentes suscritos reciben el
   * nuevo estado automáticamente.
   *
   * El método aplica valores por defecto para propiedades opcionales:
   * - type: 'decision-gateway' si no se especifica
   * - x: 300 (posición horizontal centrada)
   * - y: 200 (posición vertical centrada)
   * - status: 'active' (gateway activo por defecto)
   *
   * Caso de uso típico: GatewayPanel o Dashboard llaman a este método cuando
   * el usuario solicita agregar un nuevo gateway al diagrama de proceso.
   */
  create(payload: Omit<Gateway, 'id'>): Observable<Gateway> {
    const gatewayToCreate: Omit<Gateway, 'id'> = {
      type: payload.type || 'decision-gateway',
      x: payload.x ?? 300,
      y: payload.y ?? 200,
      status: payload.status || 'active',
      processId: payload.processId,
    };

    return this.http.post<Gateway>(this.httpBaseUrl, gatewayToCreate).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, created]);
      })
    );
  }

  createGateway(gateway: Gateway): Observable<Gateway> {
    return this.create(gateway);
  }

  /**
   * Métodos de actualización que permiten modificar gateways existentes.
   * Los cambios se envían al backend y el store local se sincroniza automáticamente.
   */

  /**
   * Actualiza un gateway existente en el backend y sincroniza el store local.
   *
   * Este método envía una petición PUT al backend con el gateway completo incluyendo
   * su id. El backend procesa la actualización y retorna el gateway modificado con
   * todas sus propiedades actualizadas.
   *
   * Es importante que el payload incluya el campo id para identificar qué gateway
   * actualizar. El backend busca el gateway por ese id, aplica los cambios y persiste
   * en la base de datos.
   *
   * Después de una actualización exitosa, el método encuentra el gateway en el store
   * local por su id y lo reemplaza con la versión actualizada recibida del backend.
   * Esto mantiene sincronización entre frontend y backend y dispara una emisión del
   * stream list$ para que los componentes se actualicen.
   *
   * El método preserva propiedades no especificadas mediante un merge del gateway
   * existente con los nuevos datos antes de enviar al backend.
   *
   * Casos de uso típicos:
   * - GatewayPanel: El usuario edita propiedades del gateway y guarda cambios
   * - Dashboard: El usuario arrastra un gateway a una nueva posición (actualiza x, y)
   */
    update(updated: Gateway): Observable<Gateway> {
      console.log('[GatewayService] Enviando actualización al backend:', updated);

      
      const payload = {
        ...updated,
        processId: updated.processId ?? updated.process?.id
      };

      console.log('[GatewayService] Payload corregido enviado al backend:', payload);

      return this.http.put<Gateway>(this.httpBaseUrl, payload).pipe(
        tap(updatedGateway => {
          console.log('[GatewayService] Backend respondió con:', updatedGateway);

          const current = this.store.value;
          const index = current.findIndex(g => g.id === updated.id);

          if (index !== -1) {
            const newList = [...current];
            newList[index] = updatedGateway;
            this.store.next(newList);
          } else {
            console.warn('[GatewayService] Gateway no encontrado en store:', updated.id);
          }
        })
      );
    }


  updateGateway(id: number, gateway: Gateway): Observable<Gateway> {
    return this.update({ ...gateway, id });
  }

  /**
   * Actualiza únicamente las coordenadas de posición de un gateway.
   *
   * Este método de conveniencia facilita la actualización de posición cuando el
   * usuario arrastra un gateway en el canvas del Dashboard. En lugar de requerir
   * que el Dashboard recupere todo el gateway para cambiar solo x e y, este método
   * lo hace internamente.
   *
   * Primero busca el gateway actual en el store por su id. Si existe, crea una
   * copia del gateway con las nuevas coordenadas y llama a update() para persistir
   * el cambio en el backend.
   *
   * Si el gateway no existe en el store (id inválido), retorna undefined sin
   * intentar actualizar en el backend.
   */
  move(id: number, x: number, y: number): Observable<Gateway | undefined> {
    const g = this.store.value.find(g => g.id === id);
    if (!g) return of(undefined);
    return this.update({ ...g, x, y });
  }

  /**
   * Métodos de eliminación que permiten remover gateways del sistema.
   * La eliminación es lógica (soft delete) en el backend, marcando el gateway
   * como inactivo en lugar de borrarlo físicamente de la base de datos.
   */

  /**
   * Elimina un gateway del backend y del store local.
   *
   * Este método envía una petición DELETE al backend especificando el id del
   * gateway a eliminar. El backend implementa soft delete, marcando el gateway
   * con status='inactive' en lugar de borrarlo de la base de datos.
   *
   * Después de una eliminación exitosa en el backend, el método actualiza el
   * store local removiendo el gateway del array. Esto dispara una emisión del
   * stream list$ y todos los componentes suscritos reciben el nuevo estado,
   * haciendo que el gateway desaparezca automáticamente de la interfaz.
   *
   * El método es idempotente y seguro de llamar múltiples veces con el mismo id.
   * Si el gateway no existe, el backend retornará un error pero el frontend
   * simplemente lo ignorará del store local.
   *
   * Caso de uso típico: GatewayPanel muestra un botón de eliminar que, después
   * de confirmación del usuario, llama a este método para remover el gateway.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(g => g.id !== id));
      })
    );
  }

  deleteGateway(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Método auxiliar de carga inicial desde el backend.
   *
   * Este método privado se ejecuta automáticamente en el constructor del servicio
   * para cargar todos los gateways existentes en la base de datos al store local.
   *
   * Realiza una petición GET al endpoint principal que retorna el array completo
   * de gateways. Al recibir la respuesta exitosa, actualiza el store mediante tap()
   * lo que dispara una emisión del stream list$. Los componentes que ya estén
   * suscritos recibirán los gateways inmediatamente.
   *
   * En caso de error (backend no disponible, problemas de red, etc.), el método
   * registra el error en consola pero no interrumpe la aplicación. El store quedará
   * vacío y los usuarios podrán ver que no hay gateways disponibles.
   *
   * La suscripción se maneja internamente y se completa automáticamente después
   * de la primera emisión, evitando memory leaks.
   */
  private loadFromBackend(): void {
    this.http.get<Gateway[]>(this.httpBaseUrl).pipe(
      tap(gateways => this.store.next(gateways))
    ).subscribe({
      next: () => console.log('[GatewayService] Gateways loaded from backend'),
      error: (err) => console.error('[GatewayService] Error loading gateways:', err)
    });
  }
  // Agregar después del método getCurrentSnapshot()
  // En gateway.service.ts
  getByProcessId(processId: number): Observable<Gateway[]> {
    return this.list$.pipe(
      map(gateways => gateways.filter(g => 
        g.processId === processId || g.process?.id === processId
      ))
    );
  }

  /**
   * Método auxiliar para obtener snapshot síncrono del estado actual.
   *
   * Retorna el valor actual del store sin envolverlo en Observable. Este método
   * es útil para operaciones internas que necesitan acceso inmediato al estado
   * sin reactividad.
   *
   * Advertencia: Este método no notifica cambios posteriores. Para reactividad,
   * los componentes deben usar list$ en su lugar.
   */
  getCurrentSnapshot(): Gateway[] {
    return this.store.value;
  }
}
