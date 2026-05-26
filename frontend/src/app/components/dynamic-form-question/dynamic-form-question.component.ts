import {
  Component,
  input,
  ViewChildren,
  QueryList,
  ElementRef,
  effect,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';

// Interfaces
import { IFormField } from '../../interface/form_field.interface';

/**
 * Renderer component that maps field types to PrimeNG components.
 * Receives field configuration and FormGroup from orchestrator.
 */
@Component({
  selector: 'app-dynamic-form-question',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, MultiSelectModule, TextareaModule],
  templateUrl: './dynamic-form-question.component.html',
  styleUrl: './dynamic-form-question.component.scss',
})
export class DynamicFormQuestionComponent {
  // Input: FormGroup to bind controls
  formGroup = input.required<FormGroup>();

  // Input: All field configurations
  fields = input.required<IFormField[]>();

  // Input: Flag indicating if this is the first form
  isFirstForm = input<boolean>(false);

  @ViewChildren('formField') formFields!: QueryList<ElementRef>;
  @ViewChildren('textareaField') textareaFields!: QueryList<ElementRef>;

  constructor() {
    // Ejecutar scroll y focus cuando cambie el formulario
    effect(() => {
      const currentFields = this.fields();
      if (currentFields && currentFields.length > 0) {
        setTimeout(() => this.handleNewForm(), 400);
      }
    });
  }

  private handleNewForm(): void {
    // No hacer scroll en el primer formulario
    if (this.isFirstForm()) {
      // Solo aplicar focus si el primer campo es textarea
      const firstField = this.fields()[0];
      if (firstField?.type === 'textarea' && this.textareaFields?.first) {
        setTimeout(() => {
          this.textareaFields.first.nativeElement.focus();
        }, 200);
      }
      return;
    }

    // Scroll suave para formularios siguientes sin rebote
    const firstFieldElement = this.formFields?.first?.nativeElement;
    if (firstFieldElement) {
      const elementPosition = firstFieldElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 120;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }

    // Focus en textarea si aplica
    const firstField = this.fields()[0];
    if (firstField?.type === 'textarea' && this.textareaFields?.first) {
      setTimeout(() => {
        this.textareaFields.first.nativeElement.focus();
      }, 600);
    }
  }

  /**
   * Gets error message for a specific field control
   */
  getErrorMessage(field: IFormField): string {
    const control = this.formGroup().get(field.idField);
    if (!control?.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['minlength'])
      return `La longitud mínima es ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength'])
      return `La longitud máxima es ${control.errors['maxlength'].requiredLength}`;

    return 'Valor inválido';
  }
}
