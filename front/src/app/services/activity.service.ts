import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Activity } from '../models/Activity';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly store = new BehaviorSubject<Activity[]>([
    // Datos de ejemplo para que “se vea algo”
    { id: 1, name: 'Inicio' } as Activity,
    { id: 2, name: 'Revisión' } as Activity,
  ]);

  /** stream de solo lectura */
  readonly list$ = this.store.asObservable();

  get(id: number): Observable<Activity | undefined> {
    return this.list$.pipe(map(list => list.find(a => a.id === id)));
  }

  create(payload: Omit<Activity, 'id'>): Observable<Activity> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(a => a.id ?? 0)) + 1 : 1;
    const created: Activity = { id: nextId, ...payload } as Activity;
    this.store.next([...current, created]);
    return of(created).pipe(delay(150));
  }

  update(payload: Activity): Observable<Activity> {
    const list = this.store.value.map(a => a.id === payload.id ? { ...a, ...payload } : a);
    this.store.next(list);
    return of(payload).pipe(delay(100));
  }

  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(a => a.id !== id));
    return of(void 0).pipe(delay(80));
  }
}
