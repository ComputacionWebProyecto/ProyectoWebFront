import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Process } from '../models/Process';

@Injectable({
  providedIn: 'root'
})
export class ProcessService {
  private baseUrl = 'http://localhost:8080/api/process'; 

  constructor(private http: HttpClient) { }

  
  createProcess(Process: Process): Observable<Process> {
    return this.http.post<Process>(this.baseUrl, Process);
  }

  getProcesses(): Observable<Process[]> {
    return this.http.get<Process[]>(this.baseUrl);
  }

  getProcessById(id: number): Observable<Process> {
    return this.http.get<Process>(`${this.baseUrl}/${id}`);
  }

  updateProcess(id: number, Process: Process): Observable<Process> {
    return this.http.put<Process>(this.baseUrl, Process);
  }

  deleteProcess(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { status: 'inactive' });
  }
}
