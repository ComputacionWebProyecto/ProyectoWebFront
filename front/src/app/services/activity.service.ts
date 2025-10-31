// src/app/services/activity.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Activity } from '../models/Activity';

/**
 * ActivityService - Patrón Híbrido (Store Reactivo + HTTP preparado)
 * 
 * ESTADO ACTUAL: In-memory mock (desarrollo frontend)
 * ESTADO FUTURO: HTTP al backend (activar descomentando métodos HTTP)
 * 
 * MIGRACIÓN A BACKEND:
 * 1. Descomentar httpBaseUrl y constructor HttpClient
 * 2. Reemplazar métodos mock por métodos HTTP (ya preparados abajo)
 * 3. CERO cambios en componentes (usan streams ya)
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  // 🔧 CONFIGURACIÓN BACKEND (descomentar cuando esté listo)
  // private readonly httpBaseUrl = 'http://localhost:8080/api/activity';
  
  /**
   * Store interno: cache local de activities
   * Se actualiza tras cada operación (create/update/delete)
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
   * Stream principal: Observable público para suscripciones
   * Dashboard, ActivityPanel y EdgePanel se suscriben aquí
   */
  readonly list$ = this.store.asObservable();

  /** Aliases para compatibilidad con código existente */
  readonly items$ = this.list$;

  // constructor(private http: HttpClient) {} // 🔧 Descomentar para HTTP

  // ========================================
  // MÉTODOS PÚBLICOS (In-Memory MOCK)
  // ========================================

  /** Lista todas las activities del store */
  list(): Observable<Activity[]> { 
    return this.list$; 
  }
  
  getAll(): Observable<Activity[]> { 
    return this.list$; 
  }
  
  getActivities(): Observable<Activity[]> { 
    return this.list$; 
  }

  /** Obtiene una activity por id */
  get(id: number): Observable<Activity | undefined> {
    return this.list$.pipe(map(list => list.find(a => a.id === id)));
  }

  /** Crea una nueva activity (con defaults seguros de tamaño y estado) */
  create(payload: Omit<Activity, 'id'>): Observable<Activity> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(a => a.id ?? 0)) + 1 : 1;

    const created: Activity = {
      id: nextId,
      name: payload.name || 'Nueva Activity',
      description: payload.description || '',
      // Defaults por si no vienen
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

  /** Actualiza una activity existente */
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

  /** Elimina una activity por id */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(a => a.id !== id));
    return of(void 0).pipe(delay(80));
  }

  // Aliases para compatibilidad
  add(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  new(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  save(payload: Activity) { return this.update(payload); }
  put(payload: Activity) { return this.update(payload); }
  set(payload: Activity) { return this.update(payload); }
  remove(id: number) { return this.delete(id); }

  /** Mover actividad (helper de azúcar) */
  move(id: number, x: number, y: number): Observable<Activity | undefined> {
    const a = this.store.value.find(a => a.id === id);
    if (!a) return of(undefined).pipe(delay(60));
    return this.update({ ...a, x, y });
  }

  // ========================================
  // 🔧 MÉTODOS HTTP (descomentar cuando backend esté listo)
  // ========================================

  /*
  // POST /api/activity - Crear
  createActivity(activity: Omit<Activity, 'id'>): Observable<Activity> {
    return this.http.post<Activity>(this.httpBaseUrl, activity).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, created]);
      })
    );
  }

  // PUT /api/activity - Actualizar (incluye coords x/y)
  updateActivity(activity: Activity): Observable<Activity> {
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

  // GET /api/activity - Listar todas
  getAllActivitiesHTTP(): Observable<Activity[]> {
    return this.http.get<Activity[]>(this.httpBaseUrl).pipe(
      tap(activities => this.store.next(activities))
    );
  }

  // GET /api/activity/{id} - Obtener por id
  getActivityById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.httpBaseUrl}/${id}`);
  }

  // DELETE /api/activity/{id} - Eliminar
  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(a => a.id !== id));
      })
    );
  }
  */
}
