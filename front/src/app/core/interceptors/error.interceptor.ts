import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {

        //Aqui se manejan globalmente los errores
        if (error.status === 401) {
          // si el usuario no está autorizado, se redirige al login
          this.router.navigate(['/auth/login']);
        } else if (error.status === 404) {
          // si el recurso no se encuentra, se muestra un mensaje en la consola
          console.error('Recurso no encontrado:', error.url);
        } else if (error.status >= 500) {
            // si hay un error del servidor, se muestra un mensaje en la consola
          console.error('Error del servidor:', error.message);
        }

        // Muestra un mensaje general de error al usuario
        alert('Ocurrió un error al procesar tu solicitud.');

        // Propaga el error si el componente necesita manejarlo
        return throwError(() => error);
      })
    );
  }
}
