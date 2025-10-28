// src/app/services/gateway.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gateway } from '../models/Gateway';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  // Usa el proxy (proxy.conf.json) en dev; en prod ajusta el baseUrl según tu env
  private baseUrl = 'http://localhost:8080/api/gateway';

  constructor(private http: HttpClient) {}

  /** Crea un gateway en backend */
  createGateway(gateway: Gateway): Observable<Gateway> {
    return this.http.post<Gateway>(this.baseUrl, gateway);
  }

  /** Lista gateways (filtra por proceso en backend si aplica) */
  getGateways(): Observable<Gateway[]> {
    return this.http.get<Gateway[]>(this.baseUrl);
  }

  /** Obtiene un gateway por id */
  getGatewayById(id: number): Observable<Gateway> {
    return this.http.get<Gateway>(`${this.baseUrl}/${id}`);
  }

  /** Actualiza un gateway por id (incluye coords x/y) */
  updateGateway(id: number, gateway: Gateway): Observable<Gateway> {
    // Importante: hacer PUT a /gateway/{id}, no a /gateway
    return this.http.put<Gateway>(`${this.baseUrl}/${id}`, gateway);
  }

  /** Elimina un gateway por id */
  deleteGateway(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
