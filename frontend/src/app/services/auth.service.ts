import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroment } from '../../enviroment/enviroment';
import { Router } from '@angular/router';

/**
 * Authentication Service
 * 
 * Manages user authentication operations including:
 * - User login with credentials
 * - JWT token management and storage
 * - User logout and session cleanup
 * - Token decoding and user ID extraction
 * 
 * The service handles JWT tokens stored in localStorage and provides
 * utilities for extracting user information from the token payload.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${enviroment.apiUrl}/user`; // http://localhost:3000/api/user

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /**
   * Authenticates a user with the backend and retrieves a JWT token.
   * 
   * @param credentials Object containing user authentication credentials
   * @param credentials.userId The user's unique identifier
   * @param credentials.password The user's password
   * @returns Observable that emits the authentication response containing the JWT token
   */
  login(credentials: { userId: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  /**
   * Logs out the current user by clearing any stored authentication data.
   */
  logout(): void {
    localStorage.removeItem('token');
  }

  /**
   * Extracts and returns the numeric user ID from the stored JWT token.
   * 
   * JWT Structure: header.payload.signature
   * The payload contains user claims including the user ID.
   * 
   * @returns The numeric user ID if token exists and is valid, null otherwise
   * @throws Returns null if token is missing, malformed, or decoding fails
   */
  getNumUserIdFromToken(): number | null {
    try {
      // Retrieve the JWT token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        return null;
      }

      // Decode the JWT payload (second part of the token: header.payload.signature)
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));

      // Extract the user ID from the decoded payload
      // Note: The property name may vary (id, userId, sub, etc.) depending on backend implementation
      const userId = decodedPayload.id;

      return userId;
    } catch (error) {
      // Token decoding failed (malformed token or invalid base64)
      return null;
    }
  }
}
