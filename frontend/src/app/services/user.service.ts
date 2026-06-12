import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../interface/user.interface';

/**
 * User Service
 * 
 * Manages user data operations including:
 * - Fetching user information by ID
 * - User profile management
 * 
 * Works with authenticated endpoints requiring JWT token
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/user`; // http://localhost:3000/api/user

  constructor(private http: HttpClient) {}

  /**
   * Retrieves user data by user ID.
   * Requires authentication token in headers.
   * 
   * @param userId The numeric ID of the user to retrieve
   * @returns Observable that emits the user data (excluding password)
   */
  getUserById(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}`);
  }

  /**
   * Retrieves the email of the authenticated user.
   * Requires authentication token in headers.
   * 
   * @returns Observable that emits the user's email address
   */
  getUserEmail(): Observable<{ mail: string }> {
    return this.http.get<any>(`${this.apiUrl}/email`).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || 'Error al obtener el email del usuario');
        }
        return response.data;
      })
    );
  }
}
