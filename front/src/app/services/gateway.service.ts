import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gateway } from '../models/Gateway';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  private baseUrl = 'http://localhost:8080/api/gateways'; 

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

  getGatewaysByProcess(processId: number): Observable<Gateway[]> {
    return this.http.get<Gateway[]>(`${this.baseUrl}/process/${processId}`);
  }

  updateGateway(id: number, gateway: Gateway): Observable<Gateway> {
    return this.http.put<Gateway>(`${this.baseUrl}/${id}`, gateway);
  }

  deleteGateway(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { status: 'inactive' });
  }
}
