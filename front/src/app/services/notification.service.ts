import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private counter = 0;

  showSuccess(message: string) {
    this.addToast(message, 'success');
  }

  showError(message: string) {
    this.addToast(message, 'error');
  }

  showInfo(message: string) {
    this.addToast(message, 'info');
  }

  showWarning(message: string) {
    this.addToast(message, 'warning');
  }

  remove(id: number) {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  private addToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const current = this.toastsSubject.value;
    const toast: Toast = { message, type, id: this.counter++ };
    this.toastsSubject.next([...current, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.remove(toast.id);
    }, 5000);
  }
}
