import { ValidatorFn, Validators } from '@angular/forms';
import { IFormField, IFieldValidator } from '../interface/form_field.interface';

/**
 * Abstract base class representing a dynamic form field.
 * Provides common structure and validation logic for all field types.
 *
 * @template T - The value type stored by this field (e.g., string, number).
 */
export abstract class FormFieldBase<T> {
  idField: string;
  question: string;
  type: string;
  required: boolean;
  value?: T;
  placeholder?: string;
  options?: string[][] | string[];
  validators: ValidatorFn[];

  constructor(config: IFormField) {
    this.idField = config.idField;
    this.question = config.question;
    this.type = config.type;
    this.required = config.required;
    this.value = config.value as T;
    this.placeholder = config.placeholder || '';
    this.options = config.options || [];
    this.validators = this.buildValidators(config);
  }

  /**
   * Builds an array of Angular ValidatorFn from the field configuration.
   * Converts custom validator definitions into Angular reactive form validators.
   *
   * @param {IFormField} config - The field configuration containing validation rules.
   * @returns {ValidatorFn[]} Array of Angular validator functions to apply to the form control.
   */
  private buildValidators(config: IFormField): ValidatorFn[] {
    const validatorFns: ValidatorFn[] = [];

    if (this.required) {
      validatorFns.push(Validators.required);
    }

    if (config.validators) {
      config.validators.forEach((validator) => {
        switch (validator.type) {
          case 'minLength':
            validatorFns.push(Validators.minLength(validator.value as number));
            break;
          case 'maxLength':
            validatorFns.push(Validators.maxLength(validator.value as number));
            break;
        }
      });
    }

    return validatorFns;
  }
}



/**
 * Concrete implementation for select dropdown fields.
 * Stores array of selected string values for single or multi-select options.
 */
export class SelectFieldModel extends FormFieldBase<string[]> {
  override type = 'select';
}

/**
 * Concrete implementation for multi-line text input fields.
 * Stores string values and renders as textarea elements for longer text content.
 */
export class TextAreaFieldModel extends FormFieldBase<string> {
  override type = 'textarea';
}
