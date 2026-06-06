import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { enviroment } from '../../enviroment/enviroment';
import { IConsultingProposal } from '../interface/consulting.proposal.interface';
import { IPdfReportData } from '../interface/pdf_report.interface';
import { response } from 'express';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${enviroment.apiUrl}/report`;

  constructor(
    private http: HttpClient,
    private errorService: ErrorService,
  ) {}

  /**
   * Solicita la generación de la propuesta de consultoría.
   *
   * @param consultingId - ID de la consultoría
   * @returns Observable con la propuesta generada
   */
  generateProposal(consultingId: number): Observable<IConsultingProposal> {
    return this.http
      .post<any>(`${this.apiUrl}/generate/${consultingId}`, {})
      .pipe(
        map((response) => {
          if (response.code !== 200 && response.code !== 201) {
            throw new Error(response.msg || 'Error al generar la propuesta');
          }
          return response.data;
        }),
        catchError((error) => {
          const errorMsg = error.error?.msg || 'Error al generar la propuesta';
          this.errorService.showError(errorMsg);
          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  public generatePdfReport(consultingId: number): Observable<IPdfReportData> {
    return this.http.get<any>(`${this.apiUrl}/pdf/${consultingId}`).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || 'Error al generar el reporte PDF');
        }
        return response.data;
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || 'Error al generar el reporte PDF';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  public getReportByConsultingId(consultingId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get-report/${consultingId}`).pipe(
      map((response) => {
        if (response.code !== 200 && response.code !== 204) {
          throw new Error(response.msg || 'Error al obtener el reporte');
        }
        return response.data;
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || 'Error al obtener el reporte';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Sends a PDF report to specified email address.
   *
   * @param consultingId - ID of the consulting session
   * @param recipientEmail - Email address to send the report to
   * @returns Observable with the send confirmation data
   */
  public sendReportByEmail(
    consultingId: number,
    recipientEmail: string,
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/send-email/${consultingId}`, {
        recipientEmail,
      })
      .pipe(
        map((response) => {
          if (response.code !== 200) {
            throw new Error(
              response.msg || 'Error al enviar el reporte por email',
            );
          }
          return response.data;
        }),
        catchError((error) => {
          const errorMsg =
            error.error?.msg || 'Error al enviar el reporte por email';
          this.errorService.showError(errorMsg);
          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  /**
   * Views a PDF report by generating it and opening in a new tab.
   *
   * @param consultingId - ID of the consulting session
   */
  public viewPdfReport(consultingId: number): void {
    this.generatePdfReport(consultingId).subscribe({
      next: (response) => {
        try {
          this.openPdfFromBase64(response.pdfBase64);
        } catch (error) {
          console.error('Error opening PDF:', error);
          this.errorService.showError(
            'Error al abrir el PDF. Por favor, intenta de nuevo.',
          );
        }
      },
      error: (error) => {
        console.error('Error generating PDF report:', error);
        // Error already handled by ErrorService in generatePdfReport
      },
    });
  }

  private openPdfFromBase64(pdfBase64: string): void {
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
