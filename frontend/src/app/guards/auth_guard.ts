import { CanActivate, Router } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}
  /**
   * Check if there is a valid JWT while navigating.
   *
   * @returns True if JWT token exists. False otherwise.
   */
  canActivate(): boolean {
    const tokenIsActive = localStorage.getItem('token') ? true : false;
    if (tokenIsActive) {
      return true;
    }

    // Default path is login component.
    this.router.navigate(['']);
    return false;
  }
}
