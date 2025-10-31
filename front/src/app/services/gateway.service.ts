// src/app/services/gateway.service.ts
import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Gateway } from '../models/Gateway';

/**
 * GatewayService - Patrón Híbrido (Store Reactivo + HTTP preparado)
 * 
 * ESTADO ACTUAL: In-memory mock (desarrollo frontend)
 * ESTADO FUTURO: HTTP al backend (activar descomentando métodos HTTP)
 * 
 * MIGRACIÓN A BACKEND:
 * 1. Descomentar httpBaseUrl y constructor HttpClient
 * 2. Reemplazar métodos mock por métodos HTTP (ya preparados abajo)
 * 3. CERO cambios en componentes (usan streams ya)
 */
@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  // 🔧 CONFIGURACIÓN BACKEND (descomentar cuando esté listo)
  // private readonly httpBaseUrl = 'http://localhost:8080/api/gateway';

  /**
   * Store interno: cache local de gateways
   * Se actualiza tras cada operación (create/update/delete)
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
   * Stream principal: Observable público para suscripciones
   * Dashboard, GatewayPanel y EdgePanel se suscriben aquí
   */
  readonly list$ = this.store.asObservable();

  /** Aliases para compatibilidad con código existente */
  readonly items$ = this.list$;

  // constructor(private http: HttpClient) {} // 🔧 Descomentar para HTTP

  // ========================================
  // MÉTODOS PÚBLICOS (In-Memory MOCK)
  // ========================================

  /** Lista todos los gateways del store */
  list(): Observable<Gateway[]> { 
    return this.list$; 
  }
  
  getAll(): Observable<Gateway[]> { 
    return this.list$; 
  }
  
  getGateways(): Observable<Gateway[]> { 
    return this.list$; 
  }

  /** Obtiene un gateway por id */
  get(id: number): Observable<Gateway | undefined> {
    return this.list$.pipe(map(list => list.find(g => g.id === id)));
  }

  getGatewayById(id: number): Observable<Gateway | undefined> {
    return this.get(id);
  }

  /** Crea un nuevo gateway (con defaults seguros) */
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
    return of(created).pipe(delay(100)); // Simula latencia de red
  }

  createGateway(gateway: Gateway): Observable<Gateway> {
    return this.create(gateway);
  }

  /** Actualiza un gateway existente */
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

  /** Elimina un gateway por id */
  delete(id: number): Observable<void> {
    const current = this.store.value;
    this.store.next(current.filter(g => g.id !== id));
    return of(void 0).pipe(delay(100));
  }

  deleteGateway(id: number): Observable<void> {
    return this.delete(id);
  }

  /** Obtiene snapshot actual del store (sin Observable) */
  getCurrentSnapshot(): Gateway[] {
    return this.store.value;
  }

  // ========================================
  // MÉTODOS HTTP (COMENTADOS - Para activar con backend)
  // ========================================

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
