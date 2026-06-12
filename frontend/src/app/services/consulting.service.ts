import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  IDynamicForm,
  IFormResponse,
  IFormField,
  IFormFromBackend,
  IFormToBackend,
} from '../interface/form_field.interface';
import { environment } from '../../environments/environment';
import { ConsultingSummary } from '../interface/consulting_sumary.interface';
import { IConsultingProposal } from '../interface/consulting.proposal.interface';
import { ErrorService } from './error.service';

/**
 * Service for managing consulting session interactions with the backend.
 * Handles creating new consultations and submitting form responses to receive AI-generated questions.
 */
@Injectable({ providedIn: 'root' })
export class ConsultingService {
  private apiUrl = `${environment.apiUrl}/consulting`;

  constructor(
    private http: HttpClient,
    private errorService: ErrorService,
  ) {}

  /**
   * Retrieves the initial diagnostic form without creating a consulting session.
   * The consulting session will be created when the user submits the first form.
   * This prevents creating empty/abandoned consultations in the database.
   *
   * @returns {Observable<IFormFromBackend>} Observable with the initial form data.
   */
  getInitialForm(): Observable<IFormFromBackend> {
    return this.http.get<any>(`${this.apiUrl}/get-initial-form`).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(
            response.msg || 'Error obteniendo formulario inicial',
          );
        }
        return response.data as IFormFromBackend;
      }),
      catchError((error) => {
        const errorMsg =
          error.error?.msg || 'Error al cargar el formulario inicial';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Submits user responses to the backend and retrieves the next set of AI-generated questions.
   * This method handles the conversation flow between user and AI consultant.
   * If this is the first form submission (consultingID = -1), the title parameter can be provided
   * to set the consulting session name.
   *
   * @param {IFormResponse} formResponse - The completed form with user's answers.
   * @param {string} [title] - Optional title for new consultation (used only when consultingID is 0).
   * @returns {Observable<IDynamicForm>} Observable with the next dynamic form configuration.
   *
   * @example
   * const response: IFormResponse = {
   *   consultingId: '123',
   *   formId: '456',
   *   responses: [
   *     { idField: 'companyName', response: 'Acme Corp' },
   *     { idField: 'revenue', response: '750000' }
   *   ],
   *   submittedAt: new Date()
   * };
   *
   */
  submitFormResponses(
    formResponse: IFormResponse,
    title?: string,
  ): Observable<IDynamicForm> {
    // Convert string IDs to numbers for backend
    const consultingIdNum = parseInt(formResponse.consultingId, 10);
    const formIdNum = parseInt(formResponse.formId, 10);

    if (isNaN(consultingIdNum) || isNaN(formIdNum)) {
      return throwError(
        () => new Error('ID de consultoría o formulario inválido'),
      );
    }

    //following IFieldResponse
    const finalResponses = formResponse.responses.map((res) => {
      const value = res.response;

      // check if value is null or undefined
      const isNullOrUndefined = value === null || value === undefined;

      //if it's a string, we also check if it's empty or just whitespace
      const isStringEmpty = typeof value === 'string' && value.trim() === '';

      // If the value is null, undefined, or an empty string, we set a default message
      const finalResponse =
        isNullOrUndefined || isStringEmpty ? 'No contestada' : String(value);

      return {
        idField: res.idField,
        response: finalResponse,
      };
    });

    // Transform to backend expected format (IFormToBackend)
    const payload: IFormToBackend = {
      consultingID: consultingIdNum,
      formID: formIdNum,
      responses: finalResponses,
    };

    // Include title if this is first form submission (consultingID = -1) and title is provided
    if (consultingIdNum === -1 && title) {
      payload.title = title;
    }

    return this.http.post<any>(`${this.apiUrl}/send-message`, payload).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(
            response.msg || 'Error al procesar el envío del formulario',
          );
        }

        // Transform backend response to frontend IDynamicForm format
        const data = response.data;

        if (!data || !data.formID) {
          throw new Error('Estructura de respuesta inválida del backend');
        }

        const dynamicForm: IDynamicForm = {
          formId: data.formID.toString(),
          consultingId: data.consultingID.toString(),
          topic: 'Consultoría', // Backend doesn't send topic, could be enhanced
          description: undefined,
          fields: (data.questions || []).map((q: IFormField) => ({
            idField: q.idField,
            question: q.question,
            type: q.type,
            required: q.required,
            options: q.options || null,
            isAnswered: q.isAnswered,
            placeholder: q.placeholder,
            validators: q.validators,
            response: q.response,
          })),
          isComplete: !data.questions || data.questions.length === 0,
          shouldGenerateProposal: data.shouldGenerateProposal || false,
          assistantMessage: data.assistantMessage || undefined,
          currentArea: data.currentArea,
          allAreas: data.allAreas,
          meanVelocity: data.meanVelocity,
        };

        return dynamicForm;
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || 'Error al enviar el formulario';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Retrieves all consulting sessions for the authenticated user.
   *
   * Fetches a list of consultation summaries including metadata such as:
   * - Consultation ID
   * - Title/description
   * - Status (active/inactive)
   * - Creation date
   * - Last modification date
   *
   * Authentication is handled via HTTP interceptor which automatically
   * includes the JWT token in the request headers.
   *
   * @returns {Observable<ConsultingSummary[]>} Observable that emits an array of
   *          consultation summaries for the current user. Returns empty array if
   *          user has no consultations.
   */
  getConsultingsByUser(): Observable<ConsultingSummary[]> {
    return this.http.get<any>(`${this.apiUrl}/get-all-consultings`).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || 'Error al obtener las consultorías');
        }
        return response.data as ConsultingSummary[];
      }),
      catchError((error) => {
        const errorMsg =
          error.error?.msg || 'Error al obtener las consultorías';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Retrieves a specific consulting session by ID.
   * Fetches complete consultation data including all forms and their fields.
   *
   * @param {number} consultingId - The unique identifier of the consulting session.
   * @returns {Observable<any>} Observable with the complete consulting data including forms.
   */
  getConsultingById(consultingId: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/get-consulting/${consultingId}`)
      .pipe(
        map((response) => {
          if (response.code !== 200) {
            throw new Error(response.msg || 'Error al obtener la consultoría');
          }
          return response.data;
        }),
        catchError((error) => {
          const errorMsg =
            error.error?.msg || 'Error al obtener la consultoría';
          this.errorService.showError(errorMsg);
          return throwError(() => new Error(errorMsg));
        }),
      );
  }

  /**
   * Deletes a consulting session and all its associated data.
   * Sends a DELETE request to remove the consulting from the database.
   *
   * @param {number} consultingId - The ID of the consulting session to delete
   * @returns {Observable<boolean>} Observable that emits true if deletion was successful
   * @throws {Error} If the user doesn't own the consulting or if it doesn't exist
   *
   * @example
   * this.consultingService.deleteConsulting(123).subscribe({
   *   next: () => console.log('Consulting deleted successfully'),
   *   error: (err) => console.error('Failed to delete:', err)
   * });
   */
  deleteConsulting(consultingId: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${consultingId}`).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(
            response.msg || 'Error al eliminar la sesión de consultoría',
          );
        }
        return response.data.deleted as boolean;
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || 'Error al eliminar la consultoría';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  /**
   * Sets the title for a consulting session.
   * This endpoint is called either when the user manually enters a title
   * or when a title is automatically generated from the first form response.
   *
   * @param {number} consultingId - The ID of the consulting session
   * @param {string} title - The title to set for the consultation
   * @returns {Observable<boolean>} Observable that emits true if the title was set successfully
   * @throws {Error} If the consulting doesn't exist or if the user doesn't own it
   */
  setTitle(consultingId: number, title: string): Observable<boolean> {
    const payload = {
      consultingId,
      title,
    };

    return this.http.post<any>(`${this.apiUrl}/set-title`, payload).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(
            response.msg || 'Error al establecer el título de la consultoría',
          );
        }
        return true;
      }),
      catchError((error) => {
        const errorMsg = error.error?.msg || 'Error al establecer el título';
        this.errorService.showError(errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }
}
