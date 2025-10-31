// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Edge, EndpointKind } from '../models/Edge';

/**
 * EdgeService - Patrón Híbrido (Store Reactivo + HTTP preparado)
 * 
 * ESTADO ACTUAL: In-memory mock (desarrollo frontend)
 * ESTADO FUTURO: HTTP al backend (activar descomentando métodos HTTP)
 * 
 * CARACTERÍSTICAS:
 * - Soporta extremos tipados (fromType/fromId, toType/toId)
 * - Mantiene compatibilidad legacy (activitySourceId/activityDestinyId)
 * - Normaliza automáticamente edges al exponerlos
 * 
 * MIGRACIÓN A BACKEND:
 * 1. Descomentar httpBaseUrl y constructor HttpClient
 * 2. Reemplazar métodos mock por métodos HTTP (ya preparados abajo)
 * 3. CERO cambios en componentes (usan streams ya)
 */

// Tipo interno con compat para el Dashboard (fromId/toId) y legado (activitySourceId/activityDestinyId)
type EdgeCompat = Edge & {
  fromId?: number;
  toId?: number;
};

@Injectable({ providedIn: 'root' })
export class EdgeService {
  // 🔧 CONFIGURACIÓN BACKEND (descomentar cuando esté listo)
  // private readonly httpBaseUrl = 'http://localhost:8080/api/edge';

  /**
   * Store interno: cache local de edges
   * 
   * SOPORTE DE MÚLTIPLES CONEXIONES:
   * ================================
   * Un gateway (o activity) puede tener MÚLTIPLES edges salientes:
   * 
   *     Activity#1 ──────────→ Activity#2
   *                            ↓
   *     Gateway#1 ──Opción A──→ Activity#1
   *          ↓
   *          └──Opción B──→ Activity#2
   * 
   * Cada edge es independiente. No hay límite de conexiones.
   * 
   * Contiene registros que pueden venir en formato legado (activitySourceId/activityDestinyId)
   * o ya en formato tipado (fromType/fromId/toType/toId). Siempre normalizamos al exponer streams.
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

  /** Stream de solo lectura crudo */
  private readonly raw$ = this.store.asObservable();

  /**
   * Stream principal: cada edge viene normalizado con:
   * - fromType/toType presentes (fallback a 'activity' si solo hay campos legados)
   * - fromId/toId presentes (fallback a activitySourceId/activityDestinyId)
   * - si ambos extremos son 'activity', también activitySourceId/activityDestinyId
   */
  readonly list$: Observable<EdgeCompat[]> = this.raw$.pipe(
    map(list => list.map(e => this.compat(e)))
  );

  /** Aliases para compatibilidad con código existente */
  readonly items$ = this.list$;
  
  // constructor(private http: HttpClient) {} // 🔧 Descomentar para HTTP

  /** Get por id */
  get(id: number): Observable<EdgeCompat | undefined> {
    return this.list$.pipe(map(list => list.find(e => e.id === id)));
  }

  /**
   * Crear (tolerante):
   * - Acepta payload con esquema tipado (fromType/fromId/toType/toId) o legado (activitySourceId/activityDestinyId)
   * - Normaliza y rellena campos de compatibilidad
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
   * Actualizar:
   * - Mergea inmutable manteniendo compat
   * - Normaliza extremos y rellena legado si corresponde (A→A)
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

  /** Eliminar */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(e => e.id !== id));
    return of(void 0).pipe(delay(80));
  }
  remove(id: number) { return this.delete(id); }

  /**
   * Asegura que un edge tenga:
   * - fromId/toId (fallback a activitySourceId/activityDestinyId)
   * - fromType/toType (fallback a 'activity' si solo hay legado)
   * - legacy poblado cuando A→A
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
   * Resuelve extremos a partir de un payload posiblemente mixto (tipado/legado).
   * - Prioriza campos tipados (fromType/fromId/toType/toId)
   * - Fallback: si hay activitySourceId/activityDestinyId, asume 'activity'
   * - Valida mínimos (fromId/toId definidos)
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

  // ========================================
  // 🔧 MÉTODOS HTTP (descomentar cuando backend esté listo)
  // ========================================

  /*
  // ⚠️ IMPORTANTE: Al activar HTTP, reemplazar métodos create/update/delete
  // por las versiones HTTP comentadas abajo

  // POST /api/edge - Crear edge (tipado + compat legacy si A→A)
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

  // PUT /api/edge - Actualizar edge
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

  // GET /api/edge - Listar todos los edges
  getAllEdgesHTTP(): Observable<Edge[]> {
    return this.http.get<Edge[]>(this.httpBaseUrl).pipe(
      tap(edges => this.store.next(edges.map(e => this.compat(e))))
    );
  }

  // GET /api/edge/{id} - Obtener por id
  getEdgeById(id: number): Observable<Edge> {
    return this.http.get<Edge>(`${this.httpBaseUrl}/${id}`);
  }

  // DELETE /api/edge/{id} - Eliminar
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
