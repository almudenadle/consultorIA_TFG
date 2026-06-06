import {
  Component,
  Input,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';

// Interfaces
import { IConsultingProposal } from '../../interface/consulting.proposal.interface';

// Services
import { ReportService } from '../../services/report.service';
import { ErrorService } from '../../services/error.service';
import { SendReportEmailComponent } from '../send-report-email/send-report-email.component';

@Component({
  selector: 'app-consulting-proposal',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    PanelModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    AccordionModule,
    TagModule,
    SendReportEmailComponent,
  ],
  templateUrl: './consulting-proposal.component.html',
  styleUrl: './consulting-proposal.component.scss',
})
export class ConsultingProposalComponent implements AfterViewInit {
  // Inputs from parent component
  @Input({ required: true }) proposalData!: IConsultingProposal;
  @Input({ required: true }) consultingId!: number;

  // State signals
  isGenerating = signal<boolean>(false);
  /** Active accordion panels — bound to p-accordion [(value)] in multiple mode */
  accordionValue = signal<number[]>([]);
  // errorMessage eliminado, ahora se usa ErrorService

  // Injected services
  private reportService = inject(ReportService);
  private errorService = inject(ErrorService);

  @ViewChild('downloadButton', { read: ElementRef })
  downloadButton?: ElementRef;

  @ViewChild(SendReportEmailComponent) emailDialog!: SendReportEmailComponent;

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToDownloadButton(), 400);
  }

  private scrollToDownloadButton(): void {
    if (this.downloadButton?.nativeElement) {
      const elementPosition =
        this.downloadButton.nativeElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 120;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }

  /**
   * Generates a PDF report for the consulting session.
   * Calls the backend service to generate the PDF and opens it in a new window.
   */
  generateReport(): void {
    // Set loading state
    this.isGenerating.set(true);

    // Call service method that handles everything
    this.reportService.viewPdfReport(this.consultingId);

    // Reset loading state after a brief delay
    setTimeout(() => this.isGenerating.set(false), 500);
  }

  /**
   * Opens the email dialog to send the report by email.
   */
  openEmailDialog(): void {
    this.emailDialog.open(this.consultingId);
  }

  /**
   * Gets a human-readable label for the timeframe value
   */
  getTimeframeLabel(timeframe: string): string {
    const labels: Record<string, string> = {
      corto_plazo: 'Corto Plazo (1-3 meses)',
      medio_plazo: 'Medio Plazo (3-12 meses)',
      largo_plazo: 'Largo Plazo (>12 meses)',
    };
    return labels[timeframe] || timeframe;
  }

  /**
   * Gets a human-readable label for the complexity value
   */
  getComplexityLabel(complexity: string): string {
    const labels: Record<string, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
    };
    return labels[complexity] || complexity;
  }

  /**
   * Gets a human-readable label for the investment level value
   */
  getInvestmentLabel(investmentLevel: string): string {
    const labels: Record<string, string> = {
      bajo: 'Bajo (<10% presupuesto anual)',
      moderado: 'Moderado (10-30%)',
      alto: 'Alto (>30%)',
    };
    return labels[investmentLevel] || investmentLevel;
  }
}
