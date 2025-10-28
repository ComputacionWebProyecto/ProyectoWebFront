// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Edge, EndpointKind } from '../models/Edge';

// Internamente mantenemos compat para el Dashboard (fromId/toId) y legado (activitySourceId/activityDestinyId)
type EdgeCompat = Edge & {
  fromId?: number;
  toId?: number;
};

@Injectable({ providedIn: 'root' })
export class EdgeService {
  /**
   * Store en memoria (sin backend).
   * Contiene registros que pueden venir en formato legado (activitySourceId/activityDestinyId)
   * o ya en formato tipado (fromType/fromId/toType/toId). Siempre normalizamos al exponer streams.
   */
  private readonly store = new BehaviorSubject<EdgeCompat[]>([
    // Ejemplo legado (A→A)
    {
      id: 1,
      label: 'Flujo 1',
      processId: 1,
      activitySourceId: 1,
      activityDestinyId: 2,
      // fromId/toId se rellenan por compat()
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

  /** Aliases que ya usas en el Dashboard */
  readonly items$ = this.list$;
  list(): Observable<EdgeCompat[]> { return this.list$; }
  getAll(): Observable<EdgeCompat[]> { return this.list$; }
  getEdges(): Observable<EdgeCompat[]> { return this.list$; }

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
}
