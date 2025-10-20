// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Edge } from '../models/Edge';

@Injectable({ providedIn: 'root' })
export class EdgeService {
  /**
   * Estado en memoria (sin backend).
   * Debe coincidir con tu interfaz Edge (con label, no description).
   *
   * Edge debería tener al menos:
   *  - id?: number
   *  - label: string
   *  - processId: number
   *  - activitySourceId: number
   *  - activityDestinyId: number
   *  - status?: 'active' | 'inactive'
   */
  private readonly store = new BehaviorSubject<Edge[]>([
    {
      id: 1,
      label: 'Flujo 1',
      processId: 1,
      activitySourceId: 1,
      activityDestinyId: 2,
      status: 'active',
    } as Edge,
  ]);

  /** stream de solo lectura */
  readonly list$: Observable<Edge[]> = this.store.asObservable();

  get(id: number): Observable<Edge | undefined> {
    return this.list$.pipe(map(list => list.find(e => e.id === id)));
  }

  create(payload: Omit<Edge, 'id'>): Observable<Edge> {
    // Validación mínima
    const label = (payload as any).label as string | undefined;
    if (
      payload.processId == null ||
      payload.activitySourceId == null ||
      payload.activityDestinyId == null ||
      !label?.trim()
    ) {
      throw new Error('Edge inválido: faltan datos obligatorios (label, processId, activitySourceId, activityDestinyId).');
    }

    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(e => e.id ?? 0)) + 1 : 1;

    const created: Edge = {
      ...payload,
      id: nextId,
      status: payload.status ?? 'active',
    } as Edge;

    this.store.next([...current, created]);
    return of(created).pipe(delay(120));
  }

  update(payload: Edge): Observable<Edge> {
    if (payload.id == null) {
      throw new Error('Edge inválido: falta id para actualizar.');
    }
    const exists = this.store.value.some(e => e.id === payload.id);
    if (!exists) {
      throw new Error(`Edge con id ${payload.id} no existe.`);
    }

    const list = this.store.value.map(e => (e.id === payload.id ? { ...e, ...payload } : e));
    this.store.next(list);
    return of(payload).pipe(delay(100));
  }

  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(e => e.id !== id));
    return of(void 0).pipe(delay(80));
  }
}
