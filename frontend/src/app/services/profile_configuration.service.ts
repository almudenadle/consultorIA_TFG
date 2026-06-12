import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ProfileData,
  UserUpdateData,
  PasswordChangeData,
} from '../interface/user.interface';
import { CompanyUpdateData } from '../interface/company.interface';
import { ApiResponse } from '../interface/api-response.interface';

/**
 * Profile Configuration Service
 *
 * Manages user and company profile operations including:
 * - Fetching current user and company profile data
 * - Updating user personal information
 * - Updating company information
 * - Changing user password
 *
 * All endpoints require authentication via JWT token (handled by AuthInterceptor).
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileConfigurationService {
  private apiUrl = `${environment.apiUrl}/user`; // http://localhost:3000/api/user

  constructor(private http: HttpClient) {}

  /**
   * Retrieves the current user's profile data including personal and company information.
   *
   * @returns Observable that emits ProfileData containing user and company information
   */
  getProfile(): Observable<ProfileData> {
    return this.http
      .get<ApiResponse<ProfileData>>(`${this.apiUrl}/profile`)
      .pipe(map((response) => response.data));
  }

  /**
   * Updates the user's personal information (name, lastName, userName, mail).
   *
   * @param userData Object containing updated user information
   * @returns Observable that emits the update response
   */
  updateProfile(userData: UserUpdateData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, userData);
  }

  /**
   * Updates the company information associated with the user.
   *
   * @param companyData Object containing updated company information
   * @returns Observable that emits the update response
   */
  updateCompany(companyData: CompanyUpdateData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/company`, companyData);
  }

  /**
   * Changes the user's password.
   *
   * @param passwordData Object containing old and new passwords
   * @returns Observable that emits the password change response
   */
  changePassword(passwordData: PasswordChangeData): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, passwordData);
  }
}
