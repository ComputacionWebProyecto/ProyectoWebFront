import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, Observable, switchMap, tap, throwError } from 'rxjs';
import { Role } from '../models/Role';
import { Process } from '../models/Process';
import { Registration } from '../models/Registration';
import { LoginRequest } from '../models/Login';
import { HttpClient } from '@angular/common/http';
import { ProcessService } from './process.service';
import { BackendUserSafeResponse } from '../models/BackendUserSafeResponse';
import { UserSafe } from '../models/UserSafe';
import { AuthorizedResponse } from '../models/AuthorizedResponse';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  role: Role = new Role('administrador', 'usuario administrador total de la compañia');
  process: Process = new Process('Proceso inicial', 'Primer proceso de la compañia');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private processService: ProcessService
  ) { }

  /**
   * Registra un nuevo usuario y su empresa.
   * CORREGIDO: El registro se considera exitoso aunque falle cargar procesos
   */
  registrar(registrationData: Registration): Observable<AuthorizedResponse> {
    return this.http.post<AuthorizedResponse>('http://localhost:8080/api/register', registrationData).pipe(
      tap(authorizedUser => {
        if (isPlatformBrowser(this.platformId)) {
          if (authorizedUser.token) {
            localStorage.setItem('token', authorizedUser.token);
            console.log('Token JWT guardado en localStorage');
          } else {
            console.warn('El backend no retornó token JWT');
          }
          console.log("usuario compañia: ", authorizedUser.user.company.id);
        }
      }),
      switchMap(authorizedUser => {
        if (!authorizedUser.user.company.id) {
          return [authorizedUser];
        }

        return this.processService.getProcessesByCompanyId(authorizedUser.user.company.id).pipe(
          tap(processes => {
            if (isPlatformBrowser(this.platformId) && processes.length > 0) {
              localStorage.setItem('activeProcessId', processes[0].id!.toString());
              console.log('Proceso activo guardado:', processes[0].id);
            }
          }),
          map(() => authorizedUser),
          catchError(processError => {
            console.log('El usuario puede cargar los procesos después desde el dashboard');
            return [authorizedUser];
          })
        );
      }),
      catchError(error => {
        console.error('Error durante registro:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Login de usuario
   * CORREGIDO: El login se considera exitoso aunque falle cargar procesos
   */
  login(credentials: LoginRequest): Observable<AuthorizedResponse> {
    return this.http.post<AuthorizedResponse>('http://localhost:8080/api/login', credentials).pipe(
      tap(authorizedUser => {
        if (isPlatformBrowser(this.platformId)) {
          if (authorizedUser.token) {
            localStorage.setItem('token', authorizedUser.token);
            console.log('Token JWT guardado en localStorage');
          } else {
            console.warn('El backend no retornó token JWT');
          }

          // Guardar el usuario completo
          localStorage.setItem('user', JSON.stringify(authorizedUser.user));
        }
      }),
      switchMap(authorizedUser => {
        if (!authorizedUser.user.company.id) {
          console.warn('Login exitoso pero sin ID de empresa');
          return [authorizedUser];
        }
        return this.processService.getProcessesByCompanyId(authorizedUser.user.company.id).pipe(
          tap(processes => {
            if (isPlatformBrowser(this.platformId) && processes.length > 0) {
              console.log('Proceso activo:', processes[0]);
              localStorage.setItem('activeProcessId', processes[0].id!.toString());
            }
          }),
          map(() => authorizedUser),
          catchError(processError => {
            console.log('El usuario puede cargar los procesos después desde el dashboard');
            return [authorizedUser];
          })
        );
      }),
      catchError(error => {
        console.error('Error durante login:', error);
        return throwError(() => error);
      })
    );
  }

  setUser(user: BackendUserSafeResponse) {
    if (isPlatformBrowser(this.platformId)) {
      if ((user as any).token) {
        localStorage.setItem('token', (user as any).token);
      }
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  getUser(): BackendUserSafeResponse | null {
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  /**
   * NUEVO: Método para obtener el token actual
   */
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('activeProcessId');
    }
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    return !!(user && token);
  }
}