import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/User';
import { catchError, map, Observable, pipe, switchMap, tap, throwError } from 'rxjs';
import { Role } from '../models/Role';
import { Process } from '../models/Process';
import { Registration } from '../models/Registration';
import { LoginRequest } from '../models/Login';
import { HttpClient } from '@angular/common/http';
import { BackendUserResponse } from '../models/BackendUserResponse';
import { ProcessService } from './process.service';
import { BackendProcessResponse } from '../models/BackendProcessResponse';


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
  ) {

  }
  registrar(registrationData: Registration): Observable<BackendUserResponse> {
    return this.http.post<BackendUserResponse>('http://localhost:8080/api/register', registrationData).pipe(
      tap(backendUser => {
        const user = new User(
          backendUser.nombre,
          backendUser.correo,
          backendUser.contrasena,
          backendUser.company.id,
          backendUser.role?.id,
          backendUser.id
        );
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(user));
        }
      }),
      switchMap(backendUser => {
        if (!backendUser.company?.id) {
          return throwError(() => new Error('ID de empresa no disponible'));
        }
        return this.processService.createDefaultProcess(backendUser.company.id).pipe(
          tap(process => {
            if (isPlatformBrowser(this.platformId) && process.id) {
              localStorage.setItem('activeProcessId', process.id.toString());
            }
          }),
          map(() => backendUser)
        );
      }),
      catchError(error => {
        console.error('Error durante registro:', error);
        return throwError(() => error);
      })
    );
  }

  login(credentials: LoginRequest): Observable<BackendUserResponse> {
    return this.http.post<BackendUserResponse>('http://localhost:8080/api/login', credentials).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(response));
        }
      }),
      switchMap(response => {
        if (!response.company?.id) {
          return throwError(() => new Error('ID de empresa no disponible'));
        }
        return this.processService.getProcessesByCompanyId(response.company.id).pipe(
          tap(processes => {
            if (isPlatformBrowser(this.platformId) && processes.length > 0) {
              console.log('Proceso activo: ', processes[0]);
              localStorage.setItem('activeProcessId', processes[0].id!.toString());
            }
          }),
          map(() => response)
        );
      }),
      catchError(error => {
        console.error('Error durante login:', error);
        return throwError(() => error);
      })
    );
  }


  setUser(user: BackendUserResponse) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  getUser(): BackendUserResponse | null {
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
    }
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const user = localStorage.getItem('user');
    return !!user;
  }

}
