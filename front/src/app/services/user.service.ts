import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { User } from '../models/User';
import { UserSafe } from '../models/UserSafe';
import { BackendUserSafeResponse } from '../models/BackendUserSafeResponse';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:8080/api/user'; 

  constructor(private http: HttpClient) { }

  
  createUser(User: User): Observable<User> {
    return this.http.post<User>(this.baseUrl, User);
  }

  getUsers(): Observable<UserSafe[]> {
    return this.http.get<UserSafe[]>(this.baseUrl);
  }

  getUserById(id: number): Observable<UserSafe> {
    return this.http.get<UserSafe>(`${this.baseUrl}/${id}`);
  }

  getUsersByCompanyId(id: number, currentUserId: number): Observable<BackendUserSafeResponse[]>{
    return this.http.get<BackendUserSafeResponse[]>(`${this.baseUrl}/company/${id}/currentUser?currentUserId=${currentUserId}`);
  }

  updateUser(id: number, User: User): Observable<User> {
    return this.http.put<User>(this.baseUrl, User);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
