import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/User';
import { Observable, pipe, tap } from 'rxjs';
import { Role } from '../models/Role';
import { Process } from '../models/Process';
import { Registration } from '../models/Registration';
import { LoginRequest } from '../models/Login';
import { HttpClient } from '@angular/common/http';
import { BackendUserResponse } from '../models/BackendUserResponse';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  role: Role = new Role('administrador', 'usuario administrador total de la compañia');
  process: Process = new Process('Proceso inicial', 'Primer proceso de la compañia');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {

  }
  registrar(registrationData: Registration): Observable<BackendUserResponse> {
    return this.http.post<BackendUserResponse>('http://localhost:8080/api/register', registrationData).pipe(
      tap((backendUser: BackendUserResponse) => {
        const user = new User(
          backendUser.nombre,
          backendUser.correo,
          backendUser.contrasena,
          backendUser.company.id,
          backendUser.role?.id,
          backendUser.id
        );

        // Guardar usuario en localStorage
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(user));
        }
      })
    );
  }

  login(credentials: LoginRequest): Observable<BackendUserResponse> {
    console.log('Enviando petición de login a backend:', credentials);
    return this.http.post<BackendUserResponse>('http://localhost:8080/api/login', credentials).pipe(
      tap((response: BackendUserResponse) => {
        console.log('Respuesta del backend:', response);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(response));
        }
      })
    );
  }

  setUser(user: BackendUserResponse) {
    // Normalizamos el formato para que siempre tenga companyId y roleId
    const normalizedUser = new User(
      user.nombre,
      user.correo,
      user.contrasena,
      user.company.id,
      user.role?.id,
      user.id
    );
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
