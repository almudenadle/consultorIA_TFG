import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

// Services and Interfaces
import { ProfileConfigurationService } from '../../services/profile_configuration.service';
import {
  ProfileData,
  UserUpdateData,
  PasswordChangeData,
} from '../../interface/user.interface';
import {
  CompanyUpdateData,
  COMPANY_SIZE_OPTIONS,
  COMPANY_SECTOR_OPTIONS,
  SelectOption,
} from '../../interface/company.interface';

/**
 * Profile Configuration Component
 *
 * Manages user and company profile information with the ability to:
 * - View current profile data
 * - Update user personal information
 * - Update company information
 * - Change password
 *
 * The component loads profile data on initialization and provides forms
 * for editing both user and company details independently.
 */
@Component({
  selector: 'app-profile-configuration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FloatLabelModule,
    ToastModule,
    DialogModule,
    PasswordModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './profile-configuration.component.html',
  styleUrl: './profile-configuration.component.scss',
})
export class ProfileConfigurationComponent implements OnInit {
  // Injected services
  private profileService = inject(ProfileConfigurationService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private router = inject(Router);

  /**
   * Form for managing user personal information.
   */
  userForm: FormGroup;

  /**
   * Form for managing company information.
   */
  companyForm: FormGroup;

  /**
   * Form for changing password.
   */
  passwordForm: FormGroup;

  /**
   * Original profile data loaded from backend.
   * Used to populate forms and detect changes.
   */
  originalProfileData?: ProfileData;

  /**
   * Flag indicating if profile data is being loaded.
   */
  loading = true;

  /**
   * Flag indicating if user data is being saved.
   */
  savingUser = false;

  /**
   * Flag indicating if company data is being saved.
   */
  savingCompany = false;

  /**
   * Flag indicating if password is being changed.
   */
  changingPassword = false;

  /**
   * Controls visibility of the password change dialog.
   */
  showPasswordDialog = false;

  /**
   * Standardized company size options.
   */
  companySizeOptions: SelectOption[] = COMPANY_SIZE_OPTIONS;

  /**
   * Standardized company sector options.
   */
  companySectorOptions: SelectOption[] = COMPANY_SECTOR_OPTIONS;

  /**
   * Password strength labels in Spanish for p-password component.
   */
  passwordLabels = {
    promptLabel: 'Ingresa una contraseña',
    weakLabel: 'Débil',
    mediumLabel: 'Media',
    strongLabel: 'Fuerte'
  };

  constructor() {
    // Initialize forms with validators
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      userName: ['', [Validators.required, Validators.minLength(3)]],
      mail: ['', [Validators.required, Validators.email]],
    });

    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      size: ['', Validators.required],
      sector: ['', Validators.required],
    });

    this.passwordForm = this.fb.group(
      {
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  /**
   * Lifecycle hook: Loads profile data on component initialization.
   */
  async ngOnInit(): Promise<void> {
    await this.loadProfileData();
  }

  /**
   * Loads profile data from the backend and populates forms.
   */
  async loadProfileData(): Promise<void> {
    try {
      this.loading = true;
      this.profileService.getProfile().subscribe({
        next: (data: ProfileData) => {
          this.originalProfileData = data;

          // Populate user form
          this.userForm.patchValue({
            name: data.user.name,
            lastName: data.user.lastName,
            userName: data.user.userName,
            mail: data.user.mail,
          });

          // Populate company form
          this.companyForm.patchValue({
            name: data.company.name,
            size: data.company.size,
            sector: data.company.sector,
          });

          this.loading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error loading profile data:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'No se pudo cargar la información del perfil',
            life: 4000,
          });
          this.loading = false;
        },
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      this.loading = false;
    }
  }

  /**
   * Saves updated user information to the backend.
   */
  saveUserProfile(): void {
    if (this.userForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor, completa todos los campos correctamente',
        life: 3000,
      });
      return;
    }

    const userData: UserUpdateData = this.userForm.value;
    this.savingUser = true;

    this.profileService.updateProfile(userData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Información personal actualizada correctamente',
          life: 3000,
        });
        this.savingUser = false;
        // Reload profile to get fresh data
        this.loadProfileData();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating user profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message ||
            'No se pudo actualizar la información personal',
          life: 4000,
        });
        this.savingUser = false;
      },
    });
  }

  /**
   * Saves updated company information to the backend.
   */
  saveCompanyProfile(): void {
    if (this.companyForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor, completa todos los campos correctamente',
        life: 3000,
      });
      return;
    }

    const companyData: CompanyUpdateData = this.companyForm.value;
    this.savingCompany = true;

    this.profileService.updateCompany(companyData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Información de la empresa actualizada correctamente',
          life: 3000,
        });
        this.savingCompany = false;
        // Reload profile to get fresh data
        this.loadProfileData();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating company profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message ||
            'No se pudo actualizar la información de la empresa',
          life: 4000,
        });
        this.savingCompany = false;
      },
    });
  }

  /**
   * Opens the password change dialog.
   */
  openPasswordDialog(): void {
    this.passwordForm.reset();
    this.showPasswordDialog = true;
  }

  /**
   * Closes the password change dialog.
   */
  closePasswordDialog(): void {
    this.showPasswordDialog = false;
    this.passwordForm.reset();
  }

  /**
   * Submits the password change request.
   */
  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor, completa todos los campos correctamente',
        life: 3000,
      });
      return;
    }

    const passwordData: PasswordChangeData = {
      oldPassword: this.passwordForm.value.oldPassword,
      newPassword: this.passwordForm.value.newPassword,
    };

    this.changingPassword = true;

    this.profileService.changePassword(passwordData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Contraseña actualizada correctamente',
          life: 3000,
        });
        this.changingPassword = false;
        this.closePasswordDialog();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error changing password:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo cambiar la contraseña',
          life: 4000,
        });
        this.changingPassword = false;
      },
    });
  }

  /**
   * Resets user form to original values.
   */
  cancelUserChanges(): void {
    if (this.originalProfileData) {
      this.userForm.patchValue({
        name: this.originalProfileData.user.name,
        lastName: this.originalProfileData.user.lastName,
        userName: this.originalProfileData.user.userName,
        mail: this.originalProfileData.user.mail,
      });
    }
  }

  /**
   * Resets company form to original values.
   */
  cancelCompanyChanges(): void {
    if (this.originalProfileData) {
      this.companyForm.patchValue({
        name: this.originalProfileData.company.name,
        size: this.originalProfileData.company.size,
        sector: this.originalProfileData.company.sector,
      });
    }
  }

  /**
   * Resets both user and company forms to original values and navigates to home.
   */
  cancelAllChanges(): void {
    this.cancelUserChanges();
    this.cancelCompanyChanges();
    this.router.navigate(['/home']);
  }

  /**
   * Saves both user and company profile changes.
   */
  async saveAllChanges(): Promise<void> {
    // Validate both forms
    if (this.userForm.invalid || this.companyForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor, completa todos los campos correctamente',
        life: 3000,
      });
      return;
    }

    // Check what needs to be saved
    const userDataChanged = this.userForm.dirty;
    const companyDataChanged = this.companyForm.dirty;

    if (!userDataChanged && !companyDataChanged) {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin cambios',
        detail: 'No se han detectado cambios para guardar',
        life: 3000,
      });
      return;
    }

    // Set saving flags
    if (userDataChanged) this.savingUser = true;
    if (companyDataChanged) this.savingCompany = true;

    const saveRequests: Promise<any>[] = [];

    // Add user update request if needed
    if (userDataChanged) {
      const userData: UserUpdateData = this.userForm.value;
      saveRequests.push(
        this.profileService.updateProfile(userData).toPromise(),
      );
    }

    // Add company update request if needed
    if (companyDataChanged) {
      const companyData: CompanyUpdateData = this.companyForm.value;
      saveRequests.push(
        this.profileService.updateCompany(companyData).toPromise(),
      );
    }

    // Execute all requests
    try {
      await Promise.all(saveRequests);

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Los cambios se han guardado correctamente',
        life: 3000,
      });

      // Reload profile data
      this.loadProfileData();
    } catch (error) {
      console.error('Error saving changes:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los cambios',
        life: 4000,
      });
    } finally {
      this.savingUser = false;
      this.savingCompany = false;
    }
  }

  /**
   * Navigates back to home page.
   */
  goBack(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Validates that password and confirmation password match.
   */
  private passwordMatchValidator(
    group: FormGroup,
  ): { [key: string]: boolean } | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
