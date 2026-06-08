import {
  Component,
  OnInit,
  inject,
  signal,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ElementRef,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

// Components
import { DynamicFormQuestionComponent } from '../dynamic-form-question/dynamic-form-question.component';
import { ConsultingProposalComponent } from '../consulting-proposal/consulting-proposal.component';

// Services
import { DynamicFormService } from '../../services/dynamic_form.service';
import { ConsultingService } from '../../services/consulting.service';
import { ReportService } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { AreaColorService } from '../../services/area-color.service';
import { ErrorService } from '../../services/error.service';

// Interfaces
import {
  IDynamicForm,
  IFormField,
  IFormFromBackend,
  IFormResponse,
} from '../../interface/form_field.interface';
import { IConsultingProposal } from '../../interface/consulting.proposal.interface';
import { IKPIArea } from '../../interface/kpi_areas.interface';
import { IFormIndexEntry } from '../../interface/form_index.interface';

/**
 * Container component that orchestrates the dynamic form rendering and submission.
 * Responsibilities:
 * - Receives consultingID from parent (or null for new consultation)
 * - Loads form data from backend (new or existing consultation)
 * - Builds a typed FormGroup based on configuration
 * - Passes FormGroup and configuration to child renderer components
 * - Handles form validation
 * - Manages form submission to backend
 * - Controls UI states (loading, submitting, errors, success)
 */
@Component({
  selector: 'app-dynamic-form-container',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    DynamicFormQuestionComponent,
    ConsultingProposalComponent,
  ],
  templateUrl: './dynamic-form-container-component.component.html',
  styleUrl: './dynamic-form-container-component.component.scss',
})
export class DynamicFormContainerComponent implements OnInit {
  // Services injection
  private dynamicFormService = inject(DynamicFormService);
  private consultingService = inject(ConsultingService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);
  private areaColorService = inject(AreaColorService);
  private errorService = inject(ErrorService);

  formGroup?: FormGroup;

  // Input: consultingID from parent (null = new consultation)
  @Input() consultingID?: number;

  // Input: initialTitle from parent (optional title for new consultation)
  @Input() initialTitle?: string;

  // Output: Unified event emitter for assistant message and KPIs data
  @Output() consultationDataUpdated = new EventEmitter<{
    assistantMessage?: string;
    currentArea?: IKPIArea;
    allAreas?: IKPIArea[];
    meanVelocity?: number;
    isProposalPhase?: boolean;
  }>();

  // Output: Emite cuando cambia el índice de formularios (completados + activo)
  @Output() formIndexUpdated = new EventEmitter<IFormIndexEntry[]>();

  // Form data
  private formID?: number;
  isFirstForm: boolean = false;
  questions?: IFormField[];

  // Área del formulario activo actual
  currentAreaName: string = 'Diagnóstico inicial';

  // History of submitted forms (necesario para renderizar formularios completados)
  submittedForms = signal<
    Array<{ fields: IFormField[]; values: any; areaName: string }>
  >([]);

  // Simplified state signals
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isGeneratingProposal = signal<boolean>(false);
  errorMessage = signal<string | undefined>(undefined);
  showProposal = signal<boolean>(false);
  proposalData = signal<IConsultingProposal | undefined>(undefined);

  // Flag to prevent multiple initializations
  private hasInitialized = false;

  // Flag to track if initial title has been set to prevent overwriting with auto-generated title
  private hasSetInitialTitle = false;

  // References to all form-card elements for scroll targeting
  @ViewChildren('formCard') formCards!: QueryList<ElementRef>;

  ngOnInit(): void {
    // Prevent multiple initializations when URL changes
    if (this.hasInitialized) {
      return;
    }
    this.hasInitialized = true;

    this.loadForm();
  }

  /**
   * Unified form loading logic.
   * Handles both new consultations and loading existing ones.
   */
  private loadForm(): void {
    // If form is already loaded in memory, skip
    if (this.formGroup && this.questions && this.questions.length > 0) {
      return;
    }

    if (this.consultingID) {
      this.loadExistingConsultation(this.consultingID);
    } else {
      this.createNewConsultation();
    }
  }

  /**
   * Loads an existing consultation by ID.
   * Fetches consultation data, separates completed and incomplete forms,
   * and initializes the active form with the incomplete one (if exists).
   *
   * @param consultingId ID of the consultation to load
   */
  private loadExistingConsultation(consultingId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(undefined);

    this.consultingService.getConsultingById(consultingId).subscribe({
      next: (consultingData) => {
        // Store consulting metadata
        this.consultingID = consultingData.id;

        // If the consulting already has a title, mark it as set to prevent auto-generation
        if (consultingData.title && consultingData.title.trim()) {
          this.hasSetInitialTitle = true;
        }

        // Check if there are any forms
        if (!consultingData.forms || consultingData.forms.length === 0) {
          this.errorMessage.set('No forms found for this consultation');
          this.isLoading.set(false);
          return;
        }

        // Separate completed and incomplete forms
        const completedForms = consultingData.forms.filter(
          (form: any) => form.isComplete,
        );
        const incompleteForm = consultingData.forms.find(
          (form: any) => !form.isComplete,
        );

        // Load completed forms into history
        if (completedForms.length > 0) {
          const formsHistory = completedForms.map((form: any) => ({
            fields: form.fields,
            values: this.extractFormValues(form.fields),
            areaName: form.areaName,
          }));
          this.submittedForms.set(formsHistory);
        }

        // If there's an incomplete form, load it as the active form
        if (incompleteForm) {
          this.formID = incompleteForm.id;
          this.questions = incompleteForm.fields;
          this.currentAreaName = incompleteForm.areaName;
          this.isFirstForm =
            consultingData.forms.length === 1 && completedForms.length === 0;

          this.createForm();
        } else {
          // All forms are completed - consultation is done
          this.questions = [];
          this.formGroup = undefined;
        }

        // Emit KPIs and last assistant message if available from backend
        if (consultingData.areas && consultingData.areas.length > 0) {
          const currentArea = consultingData.areas.find(
            (area: any) => area.status === 1, // 1 = IN_PROGRESS
          );

          // Map areas to IKPIArea interface
          const mappedAreas: IKPIArea[] = consultingData.areas.map(
            (area: any) => ({
              id: area.areaId,
              name: area.name,
              actualScore: area.actualScore,
              previousScore: area.previousScore || 0,
              status: area.status,
            }),
          );

          this.consultationDataUpdated.emit({
            assistantMessage: consultingData.lastAssistantMessage || undefined,
            currentArea: currentArea
              ? {
                  id: currentArea.areaId,
                  name: currentArea.name,
                  actualScore: currentArea.actualScore,
                  previousScore: currentArea.previousScore || 0,
                  status: currentArea.status,
                }
              : undefined,
            allAreas: mappedAreas,
            meanVelocity: consultingData.meanVelocity || 0,
          });
        }

        // Emitir índice actualizado
        this.emitFormIndex();

        this.isLoading.set(false);
        this.cdr.detectChanges();

        this.scrollToLastFormAndFocus();

        this.loadProposalIfAvailable(consultingId);

      },
      error: (error) => {
        const errorMsg = error.message || 'Error loading consultation';
        this.errorService.showError(errorMsg);
        this.errorMessage.set(errorMsg);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Extracts form values from fields array (for completed forms).
   * Maps each field's response to its idField for display in history.
   * Automatically parses JSON strings to arrays for multiselect fields.
   *
   * @param fields Array of form fields with responses
   * @returns Object mapping field IDs to their responses (string or array)
   */
  private extractFormValues(fields: any[]): Record<string, any> {
    const values: Record<string, any> = {};

    fields.forEach((field: any) => {
      if (field.isAnswered && field.response) {
        let value = field.response;

        // Si el response es un string JSON que parece un array, parsearlo
        if (
          typeof value === 'string' &&
          value.startsWith('[') &&
          value.endsWith(']')
        ) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              value = parsed;
            }
          } catch {
            // Si falla el parsing, mantener el string original
          }
        }

        values[field.idField] = value;
      }
    });

    return values;
  }

  /**
   * Creates a new consultation
   */
  private createNewConsultation(): void {
    const userID = this.authService.getNumUserIdFromToken();

    if (!userID) {
      this.errorMessage.set('User not authenticated');
      return;
    }

    // Use the new flow: just load the initial form without creating consulting
    this.isLoading.set(true);
    this.consultingService.getInitialForm().subscribe({
      next: (data: IFormFromBackend) => {
        // Set consultingID and formID to -1 to indicate no consulting created yet
        this.consultingID = -1;
        this.formID = -1;
        this.questions = data.questions;
        this.isFirstForm = true;
        this.currentAreaName = 'Diagnóstico inicial';

        // Emit initial welcome message for new consultations
        this.consultationDataUpdated.emit({
          assistantMessage:
            '¡Empecemos! Describe tu problema con el mayor detalle posible por favor',
          currentArea: undefined,
          allAreas: [],
        });

        this.createForm();
        this.isLoading.set(false);

        // Emitir índice actualizado
        this.emitFormIndex();

        // Force change detection to update template
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage.set('Error loading initial form');
        this.isLoading.set(false);
      },
    });
  }

  private createForm() {
    if (this.questions) {
      this.formGroup = this.dynamicFormService.createFormGroup(this.questions);
      this.setupDependencyListeners();
    }
  }

  /**
   * Handles form submission.
   * Extracts form values, sends to backend, and loads next form.
   * If this is the first form submission, creates the consulting session.
   */
onSubmit(): void {
    if (!this.formGroup || !this.formGroup.valid) {
      return;
    }

    if (this.isFirstForm) {
      if (this.consultingID !== -1 || this.formID !== -1) {
        this.errorMessage.set('Invalid IDs for first form submission');
        return;
      }
    } else {
      if (this.consultingID === undefined || this.formID === undefined) {
        this.errorMessage.set('Missing consultation or form ID');
        return;
      }
    }

    const formResponse: IFormResponse = this.dynamicFormService.getFormValues(
      this.formGroup,
      this.formID!.toString(),
      this.consultingID!.toString(),
    );

    this.isSubmitting.set(true);
    this.errorMessage.set(undefined);

    let titleToSend: string | undefined = undefined;

    if (this.isFirstForm) {
      if (this.initialTitle?.trim()) {
        titleToSend = this.initialTitle.trim();
        this.hasSetInitialTitle = true;
      } else {
        const firstFieldValue = this.getFirstResponseValue();
        if (firstFieldValue) {
          titleToSend = this.generateTitleFromResponse(firstFieldValue);
          this.hasSetInitialTitle = true;
        }
      }
    }

    this.consultingService
      .submitFormResponses(formResponse, titleToSend)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (nextForm: any) => {
          // 🔴 LOG 1: VER EXACTAMENTE QUÉ DEVUELVE EL BACKEND
          console.log('🛑 [DEBUG FRONTEND] Payload crudo recibido del backend:', nextForm);

         // ...
          if (this.isFirstForm) {
            this.consultingID = parseInt(nextForm.consultingId, 10);
            this.formID = parseInt(nextForm.formId || nextForm.formID, 10);
            this.isFirstForm = false;
          }

          // EXTRAER EL ARRAY CORRECTAMENTE:
          const arrayCampos = nextForm.questions || nextForm.fields || [];

          // EVALUAR CONDICIÓN DE REPORTE:
          if (nextForm.shouldGenerateProposal === true && arrayCampos.length === 0) {
            
            if (nextForm.allAreas || nextForm.currentArea || nextForm.assistantMessage) {
              this.consultationDataUpdated.emit({
                isProposalPhase: true,
                currentArea: nextForm.currentArea || undefined,
                allAreas: nextForm.allAreas || [],
                meanVelocity: nextForm.meanVelocity,
              });
            }

            this.isGeneratingProposal.set(true);
            this.questions = [];
            this.formGroup = undefined;
            
            this.cdr.detectChanges(); // Forzar actualización visual del spinner
            
            this.generateProposal();
            return;
          }

          // SI NO ES FASE DE REPORTE: Continúa normal
          this.formID = parseInt(nextForm.formId || nextForm.formID, 10);
          this.questions = arrayCampos;
// ...
          this.isFirstForm = false;
          this.currentAreaName = nextForm.currentArea?.name || 'Sin área asignada';

          if (nextForm.currentArea && nextForm.allAreas && nextForm.assistantMessage) {
            this.consultationDataUpdated.emit({
              assistantMessage: nextForm.assistantMessage,
              currentArea: nextForm.currentArea || undefined,
              allAreas: nextForm.allAreas || [],
              meanVelocity: nextForm.meanVelocity,
            });
          }

          this.createForm();
          this.emitFormIndex();
          this.cdr.detectChanges();
          this.scrollToLastFormAndFocus();
        },
        error: (err) => {
          // 🔴 LOG 3: CAPTURAR SI ALGO ROMPE LA EJECUCIÓN (Como un undefined)
          console.error('🛑 [DEBUG FRONTEND] Error grave procesando el formulario:', err);
          this.errorMessage.set(err.message || 'Error submitting form');
        },
      });
  }

  private hasNestedOptions(field: IFormField): boolean {
    return field.options != null && Array.isArray(field.options[0]);
  }

  private setupDependencyListeners(): void {
    if (!this.questions || !this.formGroup) return;
    if (!this.isFirstForm) return;

    this.questions.forEach((field, index) => {
      if (this.hasNestedOptions(field)) {
        // Buscar el campo del que depende (anterior)
        const previousField = this.questions![index - 1];
        if (!previousField) return;

        // Deshabilitar
        const control = this.formGroup!.get(field.idField);
        control?.disable();

        const originalOptions = field.options as string[][];

        // Escuchar cambios en la primera pregunta del formulario estático
        this.formGroup!.get(previousField.idField)?.valueChanges.subscribe(
          (value) => {
            if (value !== null && value !== undefined && value !== '') {
              const selectedIndex = (
                previousField.options as string[]
              )?.indexOf(value);

              // Actualizar opciones del campo dependiente
              if (
                selectedIndex !== -1 &&
                selectedIndex < originalOptions.length
              ) {
                field.options = originalOptions[selectedIndex];
                control?.enable();
                control?.setValue(null);
              }
            } else {
              // Si se limpia la selección realizada en la primera pregunta, deshabilitar y limpiar
              field.options = [];
              control?.disable();
              control?.setValue(null);
            }
          },
        );
      }
    });
  }

  private generateProposal(): void {
    if (!this.consultingID || this.consultingID === -1) {
      this.errorMessage.set('Missing consultation ID');
      this.isGeneratingProposal.set(false);
      return;
    }

    console.log('[FRONTEND REPORT REQUEST]', {
      consultingId: this.consultingID,
      isGeneratingProposal: this.isGeneratingProposal(),
    });

    this.reportService.generateProposal(this.consultingID).subscribe({
      next: (proposal) => {
        console.log('[FRONTEND REPORT RESPONSE]', {
          consultingId: this.consultingID,
          receivedKeys: proposal ? Object.keys(proposal) : [],
        });
        this.isGeneratingProposal.set(false);
        this.proposalData.set(proposal);
        this.showProposal.set(true);
        this.consultationDataUpdated.emit({ isProposalPhase: true });
        this.scrollToProposal();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Error al generar propuesta');
        this.isGeneratingProposal.set(false);
      },
    });
  }

  private loadProposalIfAvailable(consultingId: number): void {
    this.reportService.getReportByConsultingId(consultingId).subscribe({
      next: (proposal) => {
        if (proposal) {
          this.proposalData.set(proposal);
          this.showProposal.set(true);
          this.consultationDataUpdated.emit({ isProposalPhase: true });
          this.scrollToProposal();
        }
      },
      error: (err) => {
        const message = String(err?.message || '');
        if (!message.includes('Report not found')) {
          this.errorService.showError(err.message || 'Error al obtener propuesta');
        }
      },
    });
  }

  /**
   * Gets the value of the first response field from the current form.
   * Used to generate an automatic title when no title was provided.
   *
   * @returns The value of the first field or undefined if not found
   */
  private getFirstResponseValue(): string | undefined {
    if (!this.formGroup || !this.questions || this.questions.length === 0) {
      return undefined;
    }

    // Get the first field's idField
    const firstFieldId = this.questions[0].idField;
    const firstFieldValue = this.formGroup.get(firstFieldId)?.value;

    return firstFieldValue ? String(firstFieldValue) : undefined;
  }

  /**
   * Generates a consultation title from the first response and current date.
   * Format: "FirstResponse (DD/M/YYYY)"
   * Example: "Crecimiento y ventas (11/2/2026)"
   *
   * @param firstResponse The value from the first form field
   * @returns Formatted title string with response and date
   */
  private generateTitleFromResponse(firstResponse: string): string {
    return `${firstResponse} `;
  }

  /**
   * Gets the hex color for an area.
   *
   * @remarks
   * Delegates to AreaColorService for consistent color assignment.
   *
   * @param areaName The name of the KPI area
   * @returns Hex color string
   */
  /**
   * Gets the hex color for an area.
   * Used for chart colors and other elements that need solid colors.
   *
   * @param areaName The name of the KPI area
   * @returns Hex color string
   */
  getHexColor(areaName: string): string {
    return this.areaColorService.getHexColor(areaName);
  }

  /**
   * Gets RGBA color with transparency for an area.
   * Used for tag backgrounds with PrimeNG's transparent style.
   *
   * @param areaName The name of the KPI area
   * @returns RGBA color string with 16% opacity
   */
  getRgbaColor(areaName: string): string {
    return this.areaColorService.getRgbaColor(areaName);
  }

  /**
   * Construye el array de entradas para el índice de formularios.
   * Combina formularios completados + formulario activo (si existe).
   * @returns Array de entradas del índice
   */
  private buildFormIndex(): IFormIndexEntry[] {
    const entries: IFormIndexEntry[] = [];

    // Agregar formularios completados (extraer solo areaName)
    this.submittedForms().forEach((form, index) => {
      entries.push({
        formNumber: index + 1,
        areaName: form.areaName,
        isActive: false,
        isCompleted: true,
      });
    });

    // Agregar formulario activo (si existe y tiene preguntas)
    if (this.questions && this.questions.length > 0) {
      entries.push({
        formNumber: entries.length + 1,
        areaName: this.currentAreaName,
        isActive: true,
        isCompleted: false,
      });
    }

    return entries;
  }

  /**
   * Emite el índice actualizado al componente padre.
   */
  private emitFormIndex(): void {
    const formIndex = this.buildFormIndex();
    this.formIndexUpdated.emit(formIndex);
  }

  /**
   * Checks if a value is an array (for multiselect fields).
   * Also detects JSON strings that represent arrays.
   */
  isArrayValue(value: any): boolean {
    if (Array.isArray(value)) {
      return true;
    }

    // Detectar strings JSON que parecen arrays (fallback por si no se parseó antes)
    if (
      typeof value === 'string' &&
      value.startsWith('[') &&
      value.endsWith(']')
    ) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Gets array items from a value (handles both arrays and JSON strings)
   */
  getArrayItems(value: any): string[] {
    if (Array.isArray(value)) {
      return value;
    }

    // Si es un string JSON, intentar parsearlo
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }

    return [value];
  }

  private scrollToLastFormAndFocus(): void {
    setTimeout(() => {
      const activeForm = document.querySelector('.active-form');
      if (activeForm) {
        activeForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // If the first question is a textarea, focus it after the scroll settles
      if (this.questions && this.questions.length > 0 && this.questions[0].type === 'textarea') {
        setTimeout(() => {
          const textarea = document.querySelector('.active-form textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
          }
        }, 700);
      }
    }, 300);
  }

  private scrollToProposal(): void {
    setTimeout(() => {
      const proposalEl = document.querySelector('app-consulting-proposal');
      if (proposalEl) {
        proposalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
  }

}
