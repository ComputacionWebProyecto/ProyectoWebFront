import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/User';
import { Observable, pipe, tap } from 'rxjs';
import { Role } from '../models/Role';
import { Process } from '../models/Process';
import { Registration } from '../models/Registration';
import { HttpClient } from '@angular/common/http';


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
  registrar(registrationData: Registration): Observable<User> {
    return this.http.post<User>('http://localhost:8080/api/register', registrationData).pipe(
      tap((user: User) => {
      // Guardar usuario en localStorage
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      })
    );
  }


  setUser(user: User) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  getUser(): User | null {
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
