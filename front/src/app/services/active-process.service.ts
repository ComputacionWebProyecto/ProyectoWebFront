// src/app/services/active-process.service.ts
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActiveProcessService {
  private static readonly STORAGE_KEY = 'activeProcessId';

  private activeProcessIdSubject = new BehaviorSubject<number | null>(null);
  /** Stream público del id de proceso activo (o null) */
  public readonly activeProcessId$: Observable<number | null> = this.activeProcessIdSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Carga perezosa al construir (SSR-safe)
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(ActiveProcessService.STORAGE_KEY);
      const id = saved != null ? Number.parseInt(saved, 10) : NaN;
      if (!Number.isNaN(id)) this.activeProcessIdSubject.next(id);
    }
  }

  /** Id actual (snapshot) del proceso activo */
  getActiveProcessId(): number | null {
    return this.activeProcessIdSubject.value;
  }

  /** ¿Hay proceso activo? */
  hasActiveProcess(): boolean {
    return this.getActiveProcessId() != null;
  }

  /** Establece el proceso activo y persiste en localStorage (SSR-safe) */
  setActiveProcess(processId: number): void {
    this.activeProcessIdSubject.next(processId);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ActiveProcessService.STORAGE_KEY, String(processId));
    }
  }

  /** Limpia el proceso activo y borra la preferencia */
  clearActiveProcess(): void {
    this.activeProcessIdSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(ActiveProcessService.STORAGE_KEY);
    }
  }

  /** Relee desde localStorage (útil si otras partes del app tocaron el valor) */
  restoreActiveProcess(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const saved = localStorage.getItem(ActiveProcessService.STORAGE_KEY);
    const id = saved != null ? Number.parseInt(saved, 10) : NaN;
    // log de diagnóstico (puedes quitarlo si no lo necesitas)
    console.log('proceso activo (restore):', saved);
    this.activeProcessIdSubject.next(!Number.isNaN(id) ? id : null);
  }
}
