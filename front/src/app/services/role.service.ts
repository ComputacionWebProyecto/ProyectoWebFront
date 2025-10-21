import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Role } from '../models/Role';
import { BackendRoleResponse } from '../models/BackendRoleResponse';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  
  private baseUrl = 'http://localhost:8080/api/role'; 

  constructor(private http: HttpClient) { }

  
  createRole(Role: Role): Observable<Role> {
    return this.http.post<Role>(this.baseUrl, Role);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.baseUrl);
  }

  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/${id}`);
  }

  updateRole(id: number, Role: Role): Observable<Role> {
    return this.http.put<Role>(this.baseUrl, Role);
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getRolesByCompanyId(id: number): Observable<BackendRoleResponse[]>{
    return this.http.get<BackendRoleResponse[]>(`${this.baseUrl}/company/${id}`);
  }
}
