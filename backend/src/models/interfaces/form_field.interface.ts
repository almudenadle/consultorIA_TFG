/**
 * Represents a form field sent from server to client.
 * Used for rendering dynamic forms with validation rules in the frontend.
 *
 * @property {string} idField - Unique identifier for the field, used as form control key.
 * @property {string} question - Text prompt or label displayed to the user.
 * @property {string} placeholder - Placeholder text shown in the input element.
 * @property {"select" | "textarea" | "multiselect"} type - Input type determining UI component and validation behavior.
 * @property {boolean} required - Whether the field must be answered before form submission.
 * @property {string[] | string[][] | null} options - Available choices for select/multiselect fields. Can be a simple array for static options, or a nested array for dynamic cascading selects indexed by parent selection. Null for textarea type.
 * @property {boolean} [isAnswered] - Optional flag tracking whether user has provided a value.
 * @property {string} response - User's answer or default value for the field.
 * @property {IFieldValidator[]} [validators] - Optional array of validation rules to apply to the field.
 */
export interface IFormFieldToSend {
  idField: string;
  question: string;
  placeholder: string;
  type: "select" | "textarea" | "multiselect";
  required: boolean;
  options: string[] | string[][] | null;
  isAnswered?: boolean;
  response: string;
  validators?: IFieldValidator[];
}

/**
 * Defines a validation rule for form fields.
 * Maps to standard validation types with configurable constraints.
 * Used to enforce data quality and format requirements on user inputs.
 *
 * @property type - The validation rule to apply
 * @property value - The constraint value for minLength/maxLength (numeric threshold)
 * @property message - Custom error message shown when validation fails
 */
export interface IFieldValidator {
  type: "minLength" | "maxLength";
  value?: number | string;
  message?: string;
}

/**
 * Represents a form field received from client to server.
 * Contains the user's answer along with field metadata.
 *
 * @property idField - Unique identifier matching the sent field
 * @property question - Original question text for context
 * @property type - Input type used for validation
 * @property value - User-provided answer value
 */
export interface IFormFieldToRecieve {
  idField: string;
  response: string;
}
