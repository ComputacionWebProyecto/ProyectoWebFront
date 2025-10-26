import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ActiveProcessService {
  private activeProcessIdSubject = new BehaviorSubject<number | null>(null);
  public activeProcessId$: Observable<number | null> = this.activeProcessIdSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const savedProcessId = localStorage.getItem('activeProcessId');
      if (savedProcessId) {
        this.activeProcessIdSubject.next(parseInt(savedProcessId, 10));
      }
    }
  }

  setActiveProcess(processId: number): void {
    this.activeProcessIdSubject.next(processId);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('activeProcessId', processId.toString());
    }
  }

  getActiveProcessId(): number | null {
    return this.activeProcessIdSubject.value;
  }

  clearActiveProcess(): void {
    this.activeProcessIdSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('activeProcessId');
    }
  }
}
