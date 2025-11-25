import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate() {
    // Verificar primero si existe token en localStorage
    if (!this.authService.getToken()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Validar el token con el backend
    return this.authService.validateToken().pipe(
      map(isValid => {
        if (!isValid) {
          this.router.navigate(['/auth/login']);
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }
}
