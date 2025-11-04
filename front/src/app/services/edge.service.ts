// src/app/services/edge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Edge } from '../models/Edge';

/**
 * EdgeService - Integrado con Backend Spring Boot
 *
 * Servicio que gestiona el estado y las operaciones CRUD de los edges.
 * Conecta con el backend Spring Boot y mantiene un cache local reactivo mediante BehaviorSubject.
 */
@Injectable({ providedIn: 'root' })
export class EdgeService {
  private readonly httpBaseUrl = '/api/edge';
  private readonly store = new BehaviorSubject<Edge[]>([]);
  readonly list$ = this.store.asObservable();
  readonly items$ = this.list$;

  constructor(private http: HttpClient) {
    this.loadFromBackend();
  }

  list(): Observable<Edge[]> { return this.list$; }
  getAll(): Observable<Edge[]> { return this.list$; }
  getEdges(): Observable<Edge[]> { return this.list$; }
  get(id: number): Observable<Edge | undefined> {
    return this.list$.pipe(map(list => list.find(e => e.id === id)));
  }

  create(payload: Omit<Edge, 'id'>): Observable<Edge> {
    return this.http.post<Edge>(this.httpBaseUrl, payload).pipe(
      tap(created => {
        const current = this.store.value;
        this.store.next([...current, created]);
        console.log('Edge creado:', created.id, created.label);
      })
    );
  }

  update(edge: Edge): Observable<Edge> {
    return this.http.put<Edge>(this.httpBaseUrl, edge).pipe(
      tap(updated => {
        const current = this.store.value;
        const index = current.findIndex(e => e.id === edge.id);
        if (index !== -1) {
          const newList = [...current];
          newList[index] = updated;
          this.store.next(newList);
        }
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.httpBaseUrl}/${id}`).pipe(
      tap(() => {
        const current = this.store.value;
        this.store.next(current.filter(e => e.id !== id));
        console.log('Edge eliminado:', id);
      })
    );
  }

  getById(id: number): Observable<Edge> {
    return this.http.get<Edge>(`${this.httpBaseUrl}/${id}`);
  }

  private loadFromBackend(): void {
    this.http.get<Edge[]>(this.httpBaseUrl).pipe(
      tap(edges => this.store.next(edges))
    ).subscribe({
      next: () => console.log('[EdgeService] Edges loaded from backend'),
      error: (err) => console.error('[EdgeService] Error loading edges:', err)
    });
  }

  add(payload: Omit<Edge, 'id'>) { return this.create(payload); }
  new(payload: Omit<Edge, 'id'>) { return this.create(payload); }
  save(payload: Edge) { return this.update(payload); }
  put(payload: Edge) { return this.update(payload); }
  set(payload: Edge) { return this.update(payload); }
  remove(id: number) { return this.delete(id); }
}

