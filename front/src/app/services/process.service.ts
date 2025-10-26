import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Process } from '../models/Process';
import { BackendProcessResponse } from '../models/BackendProcessResponse';

@Injectable({
  providedIn: 'root'
})
export class ProcessService {
  private baseUrl = 'http://localhost:8080/api/process';

  constructor(private http: HttpClient) { }


  createProcess(process: Process): Observable<Process> {
    return this.http.post<Process>(this.baseUrl, process);
  }

  getProcesses(): Observable<BackendProcessResponse[]> {
    return this.http.get<BackendProcessResponse[]>(this.baseUrl);
  }

  getProcessById(id: number): Observable<BackendProcessResponse> {
    return this.http.get<BackendProcessResponse>(`${this.baseUrl}/${id}`);
  }

  updateProcess(id: number, process: Process): Observable<Process> {
    return this.http.put<Process>(this.baseUrl, process);
  }

  deleteProcess(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getProcessesByCompanyId(id: number): Observable<BackendProcessResponse[]> {
    return this.http.get<BackendProcessResponse[]>(`${this.baseUrl}/company/${id}`);
  }

  createDefaultProcess(id: number): Observable<Process> {
    const process = new Process (
      'Proceso inicial',
      'Proceso creado automaticamente al registrarse',
      id
    );
    return this.http.post<Process>(this.baseUrl, process);
  }

}
