import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { ErrorResponse } from '../models/error-response';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocurrió un error inesperado';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        const backendError = error.error as ErrorResponse;

        if (backendError) {
          // Prioridad 1: Errores de validación
          if (backendError.validationErrors) {
            const valErrors = Object.entries(backendError.validationErrors)
              .map(([field, msg]) => `• <strong>${field}</strong>: ${msg}`)
              .join('<br>');
            errorMessage = `${backendError.message || 'Error de validación'}<br><div class="mt-1 text-sm">${valErrors}</div>`;
          } 
          // Prioridad 2: Mensaje directo del backend
          else if (backendError.message) {
            errorMessage = backendError.message;
          } 
          // Prioridad 3: Fallback a status text
          else {
            errorMessage = `Error ${error.status}: ${error.statusText}`;
          }

          // Agregar ID de error si existe (para soporte)
          if (backendError.errorId) {
            errorMessage += `<br><small class="opacity-75 mt-1 block">Ref: ${backendError.errorId}</small>`;
          }
        } else {
          // Si no hay cuerpo de error JSON estándar
          errorMessage = `Error ${error.status}: ${error.statusText}`;
        }
      }

      if (error.status === 0) {
        notificationService.showError('No se pudo conectar con el servidor. Verifique su conexión.');
      } else {
        notificationService.showError(errorMessage);
      }

      return throwError(() => error);
    })
  );
};
