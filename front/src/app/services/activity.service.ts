// src/app/services/activity.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Activity } from '../models/Activity';

/**
 * ActivityService - Integrado con Backend Spring Boot
 * 
 * Servicio que gestiona el estado y las operaciones CRUD de las actividades (Activity).
 * Conecta con el backend Spring Boot y mantiene un cache local reactivo mediante BehaviorSubject.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly httpBaseUrl = 'http://localhost:8080/api/activity';
  private readonly store = new BehaviorSubject<Activity[]>([]);
  readonly list$ = this.store.asObservable();
  readonly items$ = this.list$;

  constructor(private http: HttpClient) {
    this.loadFromBackend();
  }

  // MÉTODOS DE CONSULTA
  list(): Observable<Activity[]> { return this.list$; }
  getAll(): Observable<Activity[]> { return this.list$; }
  getActivities(): Observable<Activity[]> { return this.list$; }
  get(id: number): Observable<Activity | undefined> {
    return this.list$.pipe(map(list => list.find(a => a.id === id)));
  }

  // CRUD - BACKEND
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

  move(activity: Activity): Observable<Activity> {
    return this.update(activity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(a => a.id !== id));
      })
    );
  }

  getById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.httpBaseUrl}/${id}`);
  }

  private loadFromBackend(): void {
    this.http.get<Activity[]>(this.httpBaseUrl).pipe(
      tap(activities => this.store.next(activities))
    ).subscribe({
      next: () => console.log('[ActivityService] Activities loaded from backend'),
      error: (err) => console.error('[ActivityService] Error loading activities:', err)
    });
  }
  getByProcessId(processId: number): Observable<Activity[]> {
    return this.list$.pipe(
      tap(list => console.log('[getByProcessId] total actividades:', list.length)),
      map(activities => activities.filter(a => a.process?.id === processId)),
      tap(filtered => console.log('[getByProcessId] filtradas para processId', processId, ':', filtered.length))
    );
  }


  // ALIASES PARA COMPATIBILIDAD
  add(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  new(payload: Omit<Activity, 'id'>) { return this.create(payload); }
  save(payload: Activity) { return this.update(payload); }
  put(payload: Activity) { return this.update(payload); }
  set(payload: Activity) { return this.update(payload); }
  remove(id: number) { return this.delete(id); }
}
