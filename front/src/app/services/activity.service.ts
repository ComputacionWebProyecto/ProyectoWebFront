// src/app/services/activity.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Activity } from '../models/Activity';

/**
 * ActivityService
 * 
 * Servicio que gestiona el estado y las operaciones CRUD de las actividades (Activity).
 * Implementa un patrón híbrido que combina un store reactivo local con preparación
 * para integración HTTP con el backend Spring Boot.
 * 
 * ARQUITECTURA:
 * El servicio utiliza un BehaviorSubject como store interno que actúa como fuente de verdad local.
 * Los componentes se suscriben al Observable público (list$) y reciben actualizaciones automáticas
 * cada vez que el store cambia mediante el método next(). Este patrón permite una UI completamente
 * reactiva sin necesidad de callbacks manuales o polling.
 * 
 * ESTADO ACTUAL:
 * Funciona con datos mock en memoria para permitir desarrollo frontend independiente del backend.
 * Las operaciones simulan latencia de red mediante el operador delay() de RxJS para emular
 * el comportamiento que tendrá cuando se conecte con HTTP.
 * 
 * MIGRACIÓN A BACKEND:
 * Para conectar con el backend Spring Boot es necesario:
 * 1. Descomentar la propiedad httpBaseUrl y ajustar la URL según el servidor
 * 2. Descomentar el constructor que inyecta HttpClient
 * 3. Reemplazar los métodos mock actuales por los métodos HTTP preparados (comentados al final)
 * 4. No se requieren cambios en los componentes porque ya trabajan con Observables
 * 
 * VENTAJAS DEL PATRÓN:
 * - Separación de responsabilidades: el servicio encapsula toda la lógica de datos
 * - Reactividad completa: los componentes se actualizan automáticamente cuando cambia el store
 * - Transición suave: pasar de mock a HTTP no requiere modificar los componentes consumidores
 * - Cache local: reduce peticiones HTTP innecesarias y mejora el rendimiento percibido
 * - Testabilidad: fácil de mockear para pruebas unitarias
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  /**
   * URL base del backend Spring Boot para las operaciones HTTP.
   * Descomentar esta línea cuando se vaya a conectar con el backend real.
   * Ajustar el puerto y la ruta según la configuración del servidor.
   */
  // private readonly httpBaseUrl = 'http://localhost:8080/api/activity';
  
  /**
   * Store interno que mantiene el estado actual de todas las actividades.
   * 
   * Se utiliza BehaviorSubject en lugar de Subject porque:
   * - Emite el valor actual inmediatamente a nuevos suscriptores (no necesitan esperar el siguiente evento)
   * - Mantiene siempre el último valor emitido en memoria (accesible mediante .value)
   * - Permite sincronización inmediata de múltiples componentes que se suscriban en diferentes momentos
   * 
   * El store se inicializa con dos actividades mock que incluyen todas las propiedades necesarias:
   * - Coordenadas (x, y) para posicionamiento en el canvas
   * - Dimensiones (width, height) para el renderizado correcto
   * - Estado (status) para filtrado y lógica de negocio
   * 
   * Estas actividades mock permiten visualizar inmediatamente el funcionamiento del dashboard
   * sin necesidad de crear actividades manualmente al iniciar la aplicación.
   */
  private readonly store = new BehaviorSubject<Activity[]>([
    // Mock inicial con coordenadas/tamaño para que se vean al cargar
    { 
      id: 1, 
      name: 'Inicio', 
      description: 'Primer paso', 
      x: 200, 
      y: 180, 
      width: 100, 
      height: 60, 
      status: 'active' 
    },
    { 
      id: 2, 
      name: 'Revisión', 
      description: 'Validación', 
      x: 360, 
      y: 180, 
      width: 100, 
      height: 60, 
      status: 'active' 
    },
  ]);

  /**
   * Stream público de solo lectura que expone el estado del store a los componentes.
   * 
   * Se utiliza asObservable() para convertir el BehaviorSubject en un Observable simple,
   * lo cual protege el store de modificaciones externas. Los componentes pueden suscribirse
   * para recibir actualizaciones pero no pueden llamar a next() directamente.
   * 
   * COMPONENTES SUSCRIPTORES:
   * - Dashboard: Obtiene todas las actividades para renderizarlas en el canvas
   * - ActivityPanel: Obtiene la lista para mostrarla en el panel lateral y para edición
   * - EdgePanel: Obtiene las actividades para poblar los selectores de origen/destino de conexiones
   * 
   * PATRÓN DE USO:
   * Los componentes se suscriben en ngOnInit() y se desuscriben en ngOnDestroy() para evitar
   * memory leaks. Cada vez que el store emite un nuevo valor, todos los suscriptores reciben
   * la lista actualizada y Angular actualiza automáticamente la vista.
   */
  readonly list$ = this.store.asObservable();

  /**
   * Alias del stream principal para compatibilidad con componentes que usan nomenclatura diferente.
   * Algunos componentes legacy pueden hacer referencia a items$ en lugar de list$.
   */
  readonly items$ = this.list$;

  /**
   * Constructor del servicio.
   * 
   * ESTADO ACTUAL (MOCK):
   * No recibe dependencias porque opera completamente en memoria sin necesidad de HTTP.
   * 
   * ESTADO FUTURO (HTTP):
   * Descomentar la inyección de HttpClient para habilitar la comunicación con el backend.
   * Cuando se active HTTP, el constructor debería inicializar el store cargando las actividades
   * desde el servidor mediante una petición GET inicial.
   */
  // constructor(private http: HttpClient) {}

  /**
   * MÉTODOS DE CONSULTA
   * 
   * Los siguientes métodos permiten obtener actividades del store sin modificar su estado.
   * Todos retornan Observables para mantener la consistencia con el patrón reactivo.
   */

  /**
   * Obtiene todas las actividades como un Observable que emite el array completo.
   * 
   * Este método es el punto de entrada principal para los componentes que necesitan
   * acceder a la lista de actividades. Retorna el stream list$ directamente.
   */
  list(): Observable<Activity[]> { 
    return this.list$; 
  }
  
  /**
   * Alias de list() para compatibilidad con diferentes convenciones de nomenclatura.
   */
  getAll(): Observable<Activity[]> { 
    return this.list$; 
  }
  
  /**
   * Alias de list() con nombre más descriptivo del dominio.
   */
  getActivities(): Observable<Activity[]> { 
    return this.list$; 
  }

  /**
   * Obtiene una actividad específica por su identificador único.
   * 
   * PARÁMETROS:
   * - id: Identificador numérico de la actividad a buscar
   * 
   * RETORNO:
   * Observable que emite la actividad encontrada o undefined si no existe.
   * 
   * IMPLEMENTACIÓN:
   * Utiliza el operador map() de RxJS para transformar el array completo de actividades
   * en un único elemento. La búsqueda se realiza mediante find() cada vez que el store
   * emite un nuevo valor, lo que garantiza que siempre se obtiene el estado más reciente.
   * 
   * USO TÍPICO:
   * ActivityPanel usa este método cuando recibe un @Input con el id de una actividad
   * que debe cargar para edición.
   */
  get(id: number): Observable<Activity | undefined> {
    return this.list$.pipe(map(list => list.find(a => a.id === id)));
  }

  /**
   * MÉTODOS DE CREACIÓN
   * 
   * Los siguientes métodos permiten agregar nuevas actividades al store.
   * Generan identificadores únicos automáticamente y aplican valores por defecto seguros.
   */

  /**
   * Crea una nueva actividad y la agrega al store.
   * 
   * PARÁMETROS:
   * - payload: Objeto con los datos de la actividad. El id se genera automáticamente y no debe incluirse.
   * 
   * RETORNO:
   * Observable que emite la actividad creada con todos sus campos completos, incluyendo el id asignado.
   * 
   * COMPORTAMIENTO:
   * 1. Obtiene el estado actual del store mediante .value
   * 2. Genera un nuevo id único: toma el máximo id existente y le suma 1, o usa 1 si no hay actividades
   * 3. Construye el objeto completo aplicando valores por defecto para campos opcionales:
   *    - name: 'Nueva Activity' si no se proporciona
   *    - width: 100px (tamaño estándar de visualización en el canvas)
   *    - height: 60px (tamaño estándar de visualización en el canvas)
   *    - x: 300 (posición horizontal por defecto en el centro del canvas)
   *    - y: 200 (posición vertical por defecto en el centro del canvas)
   *    - status: 'active' (estado inicial por defecto)
   * 4. Actualiza el store con un nuevo array que incluye todas las actividades existentes más la nueva
   * 5. Retorna la actividad creada envuelta en un Observable que simula 150ms de latencia de red
   * 
   * INMUTABILIDAD:
   * Se utiliza el spread operator (...) para crear un nuevo array sin mutar el existente.
   * Esto es crucial para que Angular detecte el cambio y actualice la vista correctamente.
   * Mutar el array directamente provocaría que Angular no detectara el cambio.
   * 
   * USO TÍPICO:
   * ActivityPanel llama a este método cuando el usuario completa y envía el formulario de creación.
   * Dashboard también puede llamarlo cuando se añade una actividad mediante drag & drop en el canvas.
   */
  create(payload: Omit<Activity, 'id'>): Observable<Activity> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(a => a.id ?? 0)) + 1 : 1;

    const created: Activity = {
      id: nextId,
      name: payload.name || 'Nueva Activity',
      description: payload.description || '',
      width: payload.width ?? 100,
      height: payload.height ?? 60,
      x: payload.x ?? 300,
      y: payload.y ?? 200,
      status: payload.status || 'active',
      processId: payload.processId,
      roleId: payload.roleId,
    };

    this.store.next([...current, created]);
    return of(created).pipe(delay(150));
  }

  /**
   * MÉTODOS DE ACTUALIZACIÓN
   * 
   * Los siguientes métodos permiten modificar actividades existentes en el store.
   * Validan la existencia del identificador y preservan los datos no modificados mediante merge.
   */

  /**
   * Actualiza una actividad existente en el store con nuevos datos.
   * 
   * PARÁMETROS:
   * - payload: Objeto Activity completo que debe incluir el id de la actividad a actualizar
   * 
   * RETORNO:
   * Observable que emite la actividad actualizada. Si el payload no tiene id, emite el payload
   * sin modificar el store y registra una advertencia en consola.
   * 
   * COMPORTAMIENTO:
   * 1. Valida que el payload incluya un id válido (truthy)
   * 2. Si no hay id, registra advertencia y retorna el payload sin modificar el store
   * 3. Si hay id, recorre el array de actividades con map()
   * 4. Cuando encuentra la actividad con el id coincidente, la reemplaza con un nuevo objeto
   *    que combina los datos existentes con los nuevos usando spread operator
   * 5. Las actividades que no coinciden se mantienen sin cambios
   * 6. Actualiza el store con el nuevo array usando next()
   * 7. Retorna la actividad actualizada con simulación de latencia de 100ms
   * 
   * MERGE DE DATOS:
   * El patrón {...a, ...payload} garantiza que:
   * - Se preservan todas las propiedades de la actividad original
   * - Solo se sobrescriben las propiedades presentes en payload
   * - Si payload tiene propiedades nuevas, se agregan al objeto
   * Esto permite actualizaciones parciales sin perder datos existentes.
   * 
   * VALIDACIÓN:
   * La validación del id evita operaciones erróneas que podrían corromper el estado.
   * La advertencia en consola ayuda durante el desarrollo a identificar llamadas incorrectas.
   * 
   * USO TÍPICO:
   * - ActivityPanel: cuando el usuario edita y guarda cambios en una actividad existente
   * - Dashboard: cuando el usuario arrastra una actividad y se actualizan sus coordenadas x,y
   * - Cualquier componente que necesite cambiar el estado o propiedades de una actividad
   */
  update(payload: Activity): Observable<Activity> {
    if (!payload.id) {
      console.warn('[ActivityService] update() requiere id');
      return of(payload);
    }

    const list = this.store.value.map(a => 
      a.id === payload.id ? { ...a, ...payload } : a
    );
    this.store.next(list);
    return of(payload).pipe(delay(100));
  }

  /**
   * Actualiza únicamente las coordenadas x,y de una actividad sin modificar otros campos.
   * 
   * PARÁMETROS:
   * - id: Identificador de la actividad a mover
   * - x: Nueva posición horizontal en píxeles dentro del canvas
   * - y: Nueva posición vertical en píxeles dentro del canvas
   * 
   * RETORNO:
   * Observable que emite la actividad con las coordenadas actualizadas, o undefined si no se encuentra.
   * 
   * COMPORTAMIENTO:
   * 1. Busca la actividad por id en el store actual usando find()
   * 2. Si no existe, retorna undefined con delay de 60ms
   * 3. Si existe, llama a update() pasando la actividad completa con las nuevas coordenadas
   * 4. El resto de propiedades se mantienen intactas gracias al spread operator
   * 
   * PROPÓSITO:
   * Este método es una utilidad de conveniencia específica para el caso de uso más común
   * del Dashboard: actualizar la posición de una actividad cuando el usuario la arrastra.
   * Evita que el Dashboard tenga que recuperar toda la actividad solo para cambiar x e y.
   * 
   * USO TÍPICO:
   * Dashboard llama a este método en el evento mouseup después de arrastrar una actividad,
   * pasando el id de la actividad y las nuevas coordenadas calculadas.
   */
  move(id: number, x: number, y: number): Observable<Activity | undefined> {
    const a = this.store.value.find(a => a.id === id);
    if (!a) return of(undefined).pipe(delay(60));
    return this.update({ ...a, x, y });
  }

  /**
   * MÉTODOS DE ELIMINACIÓN
   * 
   * Los siguientes métodos permiten remover actividades del store de forma permanente.
   */

  /**
   * Elimina una actividad del store por su identificador.
   * 
   * PARÁMETROS:
   * - id: Identificador único de la actividad a eliminar
   * 
   * RETORNO:
   * Observable que emite void (sin valor) al completarse la operación exitosamente.
   * 
   * COMPORTAMIENTO:
   * 1. Filtra el array del store excluyendo la actividad cuyo id coincide con el parámetro
   * 2. El método filter() crea un nuevo array con todas las actividades excepto la eliminada
   * 3. Actualiza el store con el nuevo array usando next()
   * 4. Retorna un Observable vacío con simulación de latencia de 80ms
   * 
   * INMUTABILIDAD:
   * El método filter() nunca muta el array original, siempre crea uno nuevo.
   * Esto es esencial para que Angular detecte el cambio y actualice la vista.
   * 
   * IDEMPOTENCIA:
   * Si el id no existe en el store, filter() simplemente retorna un array idéntico
   * al original (sin la actividad que no existía). La operación es segura de llamar
   * múltiples veces sin efectos secundarios adversos.
   * 
   * USO TÍPICO:
   * ActivityPanel llama a este método cuando el usuario hace clic en el botón "Eliminar"
   * de una actividad en la lista del panel lateral, generalmente después de mostrar
   * un diálogo de confirmación.
   */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(a => a.id !== id));
    return of(void 0).pipe(delay(80));
  }

  /**
   * ALIASES Y MÉTODOS DE COMPATIBILIDAD
   * 
   * Los siguientes métodos son aliases de los métodos principales con diferentes nombres.
   * Permiten compatibilidad con código legacy y diferentes convenciones de nomenclatura.
   */

  add(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  new(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  save(payload: Activity) { return this.update(payload); }
  put(payload: Activity) { return this.update(payload); }
  set(payload: Activity) { return this.update(payload); }
  remove(id: number) { return this.delete(id); }

  /**
   * MÉTODOS HTTP PARA INTEGRACIÓN CON BACKEND
   * 
   * Los siguientes métodos están preparados para conectar con el backend Spring Boot.
   * Actualmente están comentados porque el servicio opera con datos mock en memoria.
   * 
   * PROCESO DE MIGRACIÓN:
   * Para activar la integración HTTP con el backend:
   * 1. Verificar que el backend Spring Boot esté levantado y accesible
   * 2. Descomentar la propiedad httpBaseUrl al inicio de la clase
   * 3. Ajustar la URL si el backend usa un puerto o ruta diferente
   * 4. Descomentar el constructor que inyecta HttpClient
   * 5. Agregar en el constructor una llamada inicial a getAllActivitiesHTTP() para cargar datos
   * 6. Comentar los métodos mock actuales (create, update, delete, move)
   * 7. Descomentar estos métodos HTTP
   * 8. Opcionalmente renombrar los métodos HTTP quitando el sufijo (ej: createActivity -> create)
   * 
   * SINCRONIZACIÓN CON STORE LOCAL:
   * Todos estos métodos HTTP usan el operador tap() de RxJS para actualizar el store local
   * después de que la operación en el servidor sea exitosa. Esto mantiene el cache local
   * sincronizado con el backend y proporciona una UI reactiva sin necesidad de recargar
   * toda la lista después de cada operación.
   * 
   * ENDPOINTS ESPERADOS EN EL BACKEND:
   * - POST   /api/activity           - Crear nueva actividad
   * - PUT    /api/activity           - Actualizar actividad existente
   * - GET    /api/activity           - Obtener todas las actividades
   * - GET    /api/activity/{id}      - Obtener una actividad por id
   * - DELETE /api/activity/{id}      - Eliminar actividad por id
   * 
   * Los DTOs del backend deben coincidir con la interface Activity del frontend.
   */

  /*
  create(payload: Omit<Activity, 'id'>): Observable<Activity> {
    return this.http.post<Activity>(this.httpBaseUrl, payload).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, created]);
      })
    );
  }

  update(activity: Activity): Observable<Activity> {
    return this.http.put<Activity>(this.httpBaseUrl, activity).pipe(
      tap(updated => {
        const current = this.store.value;
        const index = current.findIndex(a => a.id === activity.id);
        
        if (index !== -1) {
          const newList = [...current];
          newList[index] = updated;
          this.store.next(newList);
        }
      })
    );
  }

  getAllActivitiesHTTP(): Observable<Activity[]> {
    return this.http.get<Activity[]>(this.httpBaseUrl).pipe(
      tap(activities => this.store.next(activities))
    );
  }

  getActivityById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.httpBaseUrl}/${id}`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(a => a.id !== id));
      })
    );
  }
  */
}
