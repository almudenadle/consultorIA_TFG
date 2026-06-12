import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { RegistrationService } from '../../services/registration.service';
import { Company } from '../../interface/user.interface';
import {
  COMPANY_SIZE_OPTIONS,
  COMPANY_SECTOR_OPTIONS,
  SelectOption,
} from '../../interface/company.interface';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ErrorService } from '../../services/error.service';

/**
 * Handles user and company registration workflow.
 *
 * This standalone Angular component manages the entire registration process,
 * coordinating dual-form validation for both user credentials and company information.
 * It enforces password matching constraints and delegates persistence to the registration service.
 *
 * @remarks
 * This component is part of the authentication flow and should only be accessible
 * to unauthenticated users. Upon successful registration, users are redirected to the login page.
 */
@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    FloatLabelModule,
    SelectModule,
  ],
  templateUrl: './registration-form.component.html',
  styleUrl: './registration-form.component.scss',
})
export class RegistrationFormComponent {
  /**
   * Reactive form managing user-specific registration fields.
   *
   * Includes validation for name, lastName, userId, email, password,
   * and password confirmation with custom cross-field validators.
   */
  registrationForm: FormGroup;

  /**
   * Reactive form managing company-specific registration fields.
   *
   * Captures organizational metadata including company name, size, and sector.
   */
  companyForm: FormGroup;

  /**
   * Indicates whether a registration request is currently in progress.
   *
   * Used to prevent duplicate submissions and display loading indicators in the UI.
   */
  loading = false;

  /**
   * Contains the current error message to display to the user.
   *
   * Populated when validation fails or the registration service returns an error.
   */
  errorMessage = '';

  /**
   * Contains the success message displayed after successful registration.
   *
   * Cleared upon form reset or new submission attempts.
   */
  successMessage = '';

  /**
   * Standardized options for the company size dropdown.
   */
  companySizeOptions: SelectOption[] = COMPANY_SIZE_OPTIONS;

  /**
   * Standardized options for the company sector dropdown.
   */
  companySectorOptions: SelectOption[] = COMPANY_SECTOR_OPTIONS;

  /**
   * Initializes the registration component and configures reactive forms.
   *
   * Sets up two independent form groups with comprehensive validation rules:
   * one for user credentials and another for company metadata. The user form
   * includes a custom validator to enforce password matching.
   *
   * @param {FormBuilder} fb - Angular's FormBuilder service for constructing reactive form controls.
   * @param {RegistrationService} registrationService - Service handling HTTP requests for user/company persistence.
   * @param {Router} router - Angular Router for post-registration navigation.
   */
  constructor(
    private fb: FormBuilder,
    private registrationService: RegistrationService,
    private router: Router,
    private errorService: ErrorService,
    ) {
    this.registrationForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.maxLength(255)]],
        lastName: ['', [Validators.required, Validators.maxLength(255)]],
        userId: ['', [Validators.required, Validators.maxLength(255)]],
        mail: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(255)],
        ],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(255),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      size: ['', [Validators.required]],
      sector: ['', [Validators.required, Validators.maxLength(255)]],
    });
  }

  /**
   * Validates that password and confirmation password fields contain identical values.
   *
   * This cross-field validator ensures data integrity before submission by comparing
   * the 'password' and 'confirmPassword' form controls. It is applied at the form group
   * level rather than individual control level.
   *
   * @param {FormGroup} group - The form group containing both password fields to validate.
   * @returns {Object | null} An error object with 'passwordMismatch' property if validation fails, null if passwords match.
   */
  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Orchestrates the complete registration workflow when the user submits the form.
   *
   * Executes a multi-step process: validates both form groups, aggregates user and company
   * data into a unified payload, submits to the registration service, and handles success/error
   * states. On successful registration, initiates a timed redirect to the login page.
   *
   * @returns {void}
   *
   * @remarks
   * This method sets the loading flag to true during HTTP requests to prevent duplicate submissions.
   * Error handling provides user-friendly messages for both validation and server-side failures.
   */
  onSubmit(): void {
    if (this.registrationForm.invalid) {
        this.errorService.showError('Por favor completa todos los campos de usuario requeridos');
      return;
    }

    if (this.companyForm.invalid) {
        this.errorService.showError('Por favor completa todos los campos de empresa requeridos');
      return;
    }

    this.loading = true;
      // Mensajes locales eliminados

    const userData = {
      name: this.registrationForm.value.name,
      lastName: this.registrationForm.value.lastName,
      userId: this.registrationForm.value.userId,
      mail: this.registrationForm.value.mail,
      password: this.registrationForm.value.password,
    };

    const companyData = {
      name: this.companyForm.value.name,
      size: this.companyForm.value.size,
      sector: this.companyForm.value.sector,
    };

    const registrationData = {
      user: userData,
      company: companyData,
    };

    this.registrationService.registerUser(registrationData).subscribe({
      next: (response) => {
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.errorService.showError(error.message || 'Error al registrar usuario. Por favor, intenta de nuevo.');
        console.error('Registration error:', error);
      },
    });
  }

  /**
   * Cancels the registration process and navigates back to the landing page.
   *
   * Clears all form controls in both user and company forms, removes validation errors,
   * and resets UI feedback messages before redirecting the user to the landing page.
   * This method is typically invoked when the user explicitly cancels the registration process.
   *
   * @returns {void}
   */
  resetForm(): void {
    this.registrationForm.reset();
    this.companyForm.reset();
    this.router.navigate(['/']);
  }

  /**
   * Navigates back to the landing page.
   */
  goBack(): void {
    this.router.navigate(['/']);
  }
}
