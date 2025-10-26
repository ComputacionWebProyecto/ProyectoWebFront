// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Edge } from '../models/Edge';

type EdgeCompat = Edge & { fromId?: number; toId?: number };

@Injectable({ providedIn: 'root' })
export class EdgeService {
  /**
   * Store en memoria (sin backend).
   * Guardamos con compatibilidad de campos para el Dashboard:
   *  - activitySourceId / activityDestinyId  (nombres “de dominio”)
   *  - fromId / toId                         (nombres que usa el SVG del board)
   */
  private readonly store = new BehaviorSubject<EdgeCompat[]>([
    {
      id: 1,
      label: 'Flujo 1',
      processId: 1,
      activitySourceId: 1,
      activityDestinyId: 2,
      fromId: 1,
      toId: 2,
      status: 'active',
    },
  ]);

  /** Stream de solo lectura “crudo” */
  private readonly raw$ = this.store.asObservable();

  /**
   * Stream principal: cada edge viene “normalizado” con fromId/toId presentes
   * aunque el origen tenga solo activitySourceId/activityDestinyId (o viceversa).
   */
  readonly list$: Observable<EdgeCompat[]> = this.raw$.pipe(
    map(list => list.map(e => this.compat(e)))
  );

  /** Alias tolerantes que el Dashboard podría intentar usar */
  readonly items$ = this.list$;
  list(): Observable<EdgeCompat[]> { return this.list$; }
  getAll(): Observable<EdgeCompat[]> { return this.list$; }
  getEdges(): Observable<EdgeCompat[]> { return this.list$; }

  /** Get por id */
  get(id: number): Observable<EdgeCompat | undefined> {
    return this.list$.pipe(map(list => list.find(e => e.id === id)));
  }

  /** Crear (tolerante: permite altas incompletas y completa luego en el panel) */
  create(payload: Omit<Edge, 'id'>): Observable<EdgeCompat> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(e => e.id ?? 0)) + 1 : 1;

    // Tolerancia: si no hay label, ponemos 'Edge'
    const label = (payload as any).label ?? 'Edge';

    // Sinónimos: aceptamos fromId/toId o activitySourceId/activityDestinyId
    const src = (payload as any).activitySourceId ?? (payload as any).fromId;
    const dst = (payload as any).activityDestinyId ?? (payload as any).toId;

    const created: EdgeCompat = {
      id: nextId,
      label,
      processId: (payload as any).processId,
      activitySourceId: src,
      activityDestinyId: dst,
      fromId: src,
      toId: dst,
      status: (payload as any).status ?? 'active',
    };

    this.store.next([...current, created]);
    return of(this.compat(created)).pipe(delay(120));
  }
  /** alias de crear */
  add(payload: Omit<Edge, 'id'>) { return this.create(payload); }
  new(payload: Omit<Edge, 'id'>) { return this.create(payload); }

  /** Actualizar (sinónimos bidireccionales + merge inmutable) */
  update(payload: Edge): Observable<EdgeCompat> {
    if (payload.id == null) {
      throw new Error('Edge inválido: falta id para actualizar.');
    }

    const src = (payload as any).activitySourceId ?? (payload as any).fromId;
    const dst = (payload as any).activityDestinyId ?? (payload as any).toId;

    const merged: EdgeCompat = {
      ...(this.store.value.find(e => e.id === payload.id) ?? { id: payload.id } as EdgeCompat),
      ...payload,
      activitySourceId: src,
      activityDestinyId: dst,
      fromId: src,
      toId: dst,
    };

    const list = this.store.value.map(e => (e.id === payload.id ? merged : e));
    this.store.next(list);
    return of(this.compat(merged)).pipe(delay(100));
  }
  /** alias de actualizar */
  save(payload: Edge) { return this.update(payload); }
  put(payload: Edge)  { return this.update(payload); }
  set(payload: Edge)  { return this.update(payload); }

  /** Eliminar */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(e => e.id !== id));
    return of(void 0).pipe(delay(80));
  }
  /** alias de eliminar */
  remove(id: number) { return this.delete(id); }

  /** Normaliza un edge para que siempre tenga fromId/toId presentes */
  private compat(e: EdgeCompat): EdgeCompat {
    const fromId = e.fromId ?? e.activitySourceId;
    const toId   = e.toId   ?? e.activityDestinyId;
    if (fromId === e.fromId && toId === e.toId) return e;
    return { ...e, fromId, toId };
  }
}
