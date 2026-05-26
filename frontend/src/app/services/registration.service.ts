import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { RegistrationRequest } from '../interface/user.interface';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private apiUrl = 'http://localhost:3000/api/user';

  constructor(
    private http: HttpClient,
    private errorService: ErrorService
  ) {}

  registerUser(data: RegistrationRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-user-and-company`, data).pipe(
      map(response => {
        if (response.code === 201) {
          return response;
        }
        throw new Error(response.msg || 'Error en el registro');
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || error.message || 'Error en el registro';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }
}
