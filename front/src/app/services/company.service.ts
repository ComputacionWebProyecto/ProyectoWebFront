import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Company } from '../models/Company';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private baseUrl = 'http://localhost:8080/api/company'; 

  constructor(private http: HttpClient) { }

  
  createCompany(company: Company): Observable<Company> {
    return this.http.post<Company>(this.baseUrl, company);
  }

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.baseUrl);
  }

  getCompanyById(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  updateCompany(id: number, company: Company): Observable<Company> {
    return this.http.put<Company>(this.baseUrl, company);
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { status: 'inactive' });
  }
}
