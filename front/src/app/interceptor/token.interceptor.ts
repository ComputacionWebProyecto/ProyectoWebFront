import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Obtener token actual
  const token = authService.getToken();

  // Si hay token, agregarlo al header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si recibimos 401 (Unauthorized), intentar renovar el token
        if (error.status === 401 && !req.url.includes('/auth/renew-token')) {
          console.log('Token expirado, intentando renovar...');
          
          return authService.renewToken().pipe(
            switchMap((response) => {
              // Token renovado exitosamente, reintentar la petición original
              const newAuthReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.token}`
                }
              });
              
              console.log('Token renovado, reintentando petición...');
              return next(newAuthReq);
            }),
            catchError((renewError) => {
              // Falló la renovación, hacer logout y redirigir
              console.error('No se pudo renovar el token, cerrando sesión');
              authService.logout();
              router.navigate(['/auth/login']);
              return throwError(() => renewError);
            })
          );
        }

        // Si es otro tipo de error, simplemente propagarlo
        return throwError(() => error);
      })
    );
  }

  // Si no hay token, continuar sin modificar la petición
  return next(req);
};