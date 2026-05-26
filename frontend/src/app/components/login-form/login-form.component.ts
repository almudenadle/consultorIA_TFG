import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ErrorService } from '../../services/error.service';

/**
 * Component that handles the user login process.
 * It provides a form for users to enter their credentials and authenticates them via the AuthService.
 */
@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    FloatLabelModule,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
})
export class LoginFormComponent {
  /** Form group that manages the login form controls. */
  loginForm: FormGroup;

  /** Flag to indicate if the login request is in progress. */
  loading: boolean = false;

  /** Stores the error message to be displayed to the user in case of login failure. */
  errorMessage?: string;

  /**
   * Initializes the LoginFormComponent.
   *
   * @param fb - The FormBuilder service used to create the form group.
   * @param authService - The AuthService used to perform the login operation.
   * @param router - The Router service used for navigation after successful login.
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private errorService: ErrorService,
  ) {
    this.loginForm = this.fb.group({
      userId: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  /**
   * Handles the form submission.
   * Validates the form and sends the login credentials to the AuthService.
   * If the login is successful, it stores the token and navigates to the home page.
   * If the login fails, it sets the error message.
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    // Mensaje local eliminado

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.code === 200 && response.data?.token) {
          // Save token and redirect
          localStorage.setItem('token', response.data.token);
          // TODO: Redirect to the main page or dashboard
          this.router.navigate(['/home']);
        } else {
          this.errorService.showError(
            response.msg || 'Error desconocido en el login',
          );
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error in login:', error);
        this.errorService.showError(
          error.error?.msg || 'No se pudo conectar con el servidor',
        );
      },
    });
  }

  /**
   * Navigates back to the landing page.
   */
  goBack(): void {
    this.router.navigate(['/']);
  }
}
