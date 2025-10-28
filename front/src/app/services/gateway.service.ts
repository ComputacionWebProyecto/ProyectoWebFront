import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gateway } from '../models/Gateway';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  private baseUrl = 'http://localhost:8080/api/gateway'; //Cambiar de 'gateways' a 'gateway'

  constructor(private http: HttpClient) {}

  createGateway(gateway: Gateway): Observable<Gateway> {
    return this.http.post<Gateway>(this.baseUrl, gateway);
  }

  getGateways(): Observable<Gateway[]> {
    return this.http.get<Gateway[]>(this.baseUrl);
  }

  getGatewayById(id: number): Observable<Gateway> {
    return this.http.get<Gateway>(`${this.baseUrl}/${id}`);
  }

  updateGateway(id: number, gateway: Gateway): Observable<Gateway> {
    return this.http.put<Gateway>(this.baseUrl, gateway);
  }

  deleteGateway(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}