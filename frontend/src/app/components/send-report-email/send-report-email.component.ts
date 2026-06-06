import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// PrimeNG Modules
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

// Services
import { UserService } from '../../services/user.service';
import { ReportService } from '../../services/report.service';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-send-report-email',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './send-report-email.component.html',
  styleUrl: './send-report-email.component.scss',
})
export class SendReportEmailComponent {
  @Input() visible = false;
  @Input() consultingId?: number;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() emailSent = new EventEmitter<void>();

  // Services
  private userService = inject(UserService);
  private reportService = inject(ReportService);
  private errorService = inject(ErrorService);
  private messageService = inject(MessageService);

  // State
  recipientEmail = '';
  isSendingEmail = false;

  /**
   * Opens the dialog and loads the user's email.
   */
  async open(consultingId: number): Promise<void> {
    this.consultingId = consultingId;

    try {
      // Fetch user's email from backend
      const response = await firstValueFrom(this.userService.getUserEmail());
      this.recipientEmail = response.mail;
      this.visible = true;
      this.visibleChange.emit(true);
    } catch (error) {
      console.error('Error fetching user email:', error);
      this.errorService.showError('Error al obtener el email del usuario');
    }
  }

  /**
   * Sends the report by email to the specified recipient.
   */
  async sendReportByEmail(): Promise<void> {
    if (!this.consultingId) {
      console.error('No consulting ID to send report');
      return;
    }

    const email = this.recipientEmail.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.errorService.showError('Por favor, ingresa un email válido');
      return;
    }

    this.isSendingEmail = true;

    try {
      await firstValueFrom(
        this.reportService.sendReportByEmail(this.consultingId, email),
      );

      this.closeDialog();

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Enviado',
        detail: `El informe ha sido enviado exitosamente a ${email}`,
        life: 5000,
      });

      // Emit event to parent
      this.emailSent.emit();
    } catch (error) {
      console.error('Error sending report by email:', error);
      // Error is already handled by ErrorService in the service layer
    } finally {
      this.isSendingEmail = false;
    }
  }

  /**
   * Closes the dialog and resets state.
   */
  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.recipientEmail = '';
    this.consultingId = undefined;
  }
}
