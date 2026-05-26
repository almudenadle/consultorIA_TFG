import { FormControl, FormGroup } from '@angular/forms';
import {
  IFormField,
  IFormResponse,
  IFieldResponse,
} from '../interface/form_field.interface';
import {
  FormFieldBase,
  SelectFieldModel,
  TextAreaFieldModel,
} from '../models/form_field_base.model';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DynamicFormService {
  constructor() {}

  /**
   * Creates an Angular FormGroup from an array of field configurations.
   * Each field is instantiated as a FormControl with its corresponding validators.
   *
   * @param {IFormField[]} fields - Array of field configurations defining the form structure.
   * @returns {FormGroup} A reactive FormGroup instance with configured controls and validators.
   */
  createFormGroup(fields: IFormField[]): FormGroup {
    const group: Record<string, FormControl> = {};

    fields.forEach((field) => {
      const fieldModel = this.createFieldModel(field);
      group[field.idField] = new FormControl(
        field.value || null,
        fieldModel.validators,
      );
    });

    return new FormGroup(group);
  }

  /**
   * Factory method that instantiates the appropriate field model based on field type.
   * Returns a concrete implementation of FormFieldBase matching the field's type property.
   *
   * @param {IFormField} field - The field configuration to convert into a model.
   * @returns {FormFieldBase<any>} A concrete field model instance (e.g., SelectFieldModel, TextAreaFieldModel).
   */
  private createFieldModel(field: IFormField): FormFieldBase<any> {
    switch (field.type) {
      case 'select':
      case 'multiselect':
        return new SelectFieldModel(field);
      default:
        return new TextAreaFieldModel(field);
    }
  }

  /**
   * Validates the entire form by marking all fields as touched and checking validity.
   * Triggers validation messages to display for invalid fields.
   *
   * @param {FormGroup} formGroup - The form group to validate.
   * @returns {boolean} True if all controls pass validation, false otherwise.
   */
  validateForm(formGroup: FormGroup): boolean {
    formGroup.markAllAsTouched();
    return formGroup.valid;
  }

  /**
   * Converts an array of field interfaces into strongly-typed field model instances.
   * Useful for working with field-specific logic beyond basic configuration.
   *
   * @param {IFormField[]} fields - Array of field configurations to convert.
   * @returns {FormFieldBase<any>[]} Array of concrete field model instances.
   */
  convertToFormFieldModels(fields: IFormField[]): FormFieldBase<any>[] {
    return fields.map((field) => this.createFieldModel(field));
  }

  /**
   * Extracts form values and packages them into a standardized response object.
   * Includes the form identifier, field values, and submission timestamp.
   * Converts FormGroup values into structured IFieldResponse array format.
   *
   * @param {FormGroup} formGroup - The form group containing user responses.
   * @param {string} formId - The unique identifier of the form being submitted.
   * @param {string} consultingId - The unique identifier of the consulting session.
   * @returns {IFormResponse} Structured response object containing form data and metadata.
   *
   * @example
   * const formResponse = this.dynamicFormService.getFormValues(
   *   this.formGroup,
   *   'form-456',
   *   'cons-123'
   * );
   * // Returns:
   * // {
   * //   consultingId: 'cons-123',
   * //   formId: 'form-456',
   * //   responses: [
   * //     { idField: 'companyName', response: 'Acme Corp' },
   * //     { idField: 'revenue', response: '750000' }
   * //   ],
   * //   submittedAt: Date
   * // }
   */
  getFormValues(
    formGroup: FormGroup,
    formId: string,
    consultingId: string,
  ): IFormResponse {
    const formValues = formGroup.value;
    const responses: IFieldResponse[] = Object.keys(formValues).map((key) => {
      const value = formValues[key];
      
      // Serializar arrays (multiselect) como JSON string para backend
      const response = Array.isArray(value) 
        ? JSON.stringify(value) 
        : value;
      
      return {
        idField: key,
        response: response,
      };
    });

    return {
      consultingId,
      formId,
      responses,
      submittedAt: new Date(),
    };
  }
}
