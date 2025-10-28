// src/app/services/activity.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Activity } from '../models/Activity';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly store = new BehaviorSubject<Activity[]>([
    // Mock inicial con coordenadas/tamaño para que se vean al cargar
    { id: 1, name: 'Inicio', description: 'Primer paso', x: 200, y: 180, width: 100, height: 60, status: 'active' },
    { id: 2, name: 'Revisión', description: 'Validación', x: 360, y: 180, width: 100, height: 60, status: 'active' },
  ]);

  /** stream de solo lectura (principal) */
  readonly list$ = this.store.asObservable();

  /** alias para tolerancia con el Dashboard/panel */
  readonly items$ = this.list$;

  /** alias de método: algunas variantes que el Dashboard podría intentar */
  list(): Observable<Activity[]> { return this.list$; }
  getAll(): Observable<Activity[]> { return this.list$; }
  getActivities(): Observable<Activity[]> { return this.list$; }

  get(id: number): Observable<Activity | undefined> {
    return this.list$.pipe(map(list => list.find(a => a.id === id)));
  }

  /** Crear (con defaults seguros de tamaño y estado) */
  create(payload: Omit<Activity, 'id'>): Observable<Activity> {
    const current = this.store.value;
    const nextId = current.length ? Math.max(...current.map(a => a.id ?? 0)) + 1 : 1;

    const created: Activity = {
      id: nextId,
      // Defaults por si no vienen
      width: 100,
      height: 60,
      status: 'active',
      // Lo que envía el caller tiene prioridad
      ...payload,
    };

    this.store.next([...current, created]);
    return of(created).pipe(delay(150));
  }
  /** alias de crear */
  add(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  new(payload: Omit<Activity, 'id'>) { return this.create(payload); }

  /** Actualizar */
  update(payload: Activity): Observable<Activity> {
    const list = this.store.value.map(a => a.id === payload.id ? { ...a, ...payload } : a);
    this.store.next(list);
    return of(payload).pipe(delay(100));
  }
  /** alias de actualizar */
  save(payload: Activity) { return this.update(payload); }
  put(payload: Activity) { return this.update(payload); }
  set(payload: Activity) { return this.update(payload); }

  /** Mover actividad (helper de azúcar) */
  move(id: number, x: number, y: number): Observable<Activity | undefined> {
    const a = this.store.value.find(a => a.id === id);
    if (!a) return of(undefined).pipe(delay(60));
    return this.update({ ...a, x, y });
  }

  /** Eliminar */
  delete(id: number): Observable<void> {
    this.store.next(this.store.value.filter(a => a.id !== id));
    return of(void 0).pipe(delay(80));
  }
  /** alias de eliminar */
  remove(id: number) { return this.delete(id); }
}
