import { IKPIArea } from './kpi_areas.interface';

/**
 * Represents the configuration schema for a dynamic form field.
 * Used to define field behavior, validation rules, and rendering options.
 *
 * @property {string} idField - Unique identifier for the field, used as the form control key.
 * @property {string} question - The label or question text displayed to the user.
 * @property {'select' | 'textarea' | 'multiselect'} type - Defines the input type to render.
 * @property {boolean} required - Indicates whether the field must be filled before submission.
 * @property {string[]} [options] - Available options for select-type fields.
 * @property {boolean} [isAnswered] - Tracks whether the user has provided a response.
 * @property {any} [value] - The current or default value of the field.
 * @property {string} [placeholder] - Placeholder text shown in the input element.
 * @property {IFieldValidator[]} [validators] - Additional validation rules to apply.
 * @property {Record<string, any>} [metadata] - Custom metadata for extended functionality.
 */
export interface IFormField {
  idField: string;
  question: string;
  type: 'select' | 'textarea' | 'multiselect';
  required: boolean;
  options: string[][] | string[] | null;
  isAnswered?: boolean;
  value?: string;
  placeholder?: string;
  validators?: IFieldValidator[];
  response?: string;
}

/**
 * Represents the initial form data received from the backend when starting or continuing a consultation.
 * This is the response structure returned by the `/api/consulting/start` endpoint.
 *
 * Used when:
 * - Creating a new consultation (returns initial form with first questions)
 * - Loading an existing consultation (returns the current form state)
 *
 * The frontend uses this data to:
 * 1. Store the consultation and form IDs for subsequent submissions
 * 2. Build the FormGroup with the provided questions
 * 3. Render the dynamic form UI
 *
 * @property {IFormField[]} [questions] - Array of form fields to display to the user.
 * @property {number} consultingID - The unique identifier for the consultation session.
 * @property {number} formID - The unique identifier for the current form instance.
 *
 */
export interface IFormFromBackend {
  consultingID: number;
  formID: number;
  questions: IFormField[];
  isFirstForm: boolean;
  shouldGenerateProposal?: boolean;
  assistantMessage?: string;
  currentArea?: IKPIArea;
  allAreas?: IKPIArea[];
  meanVelocity?: number;
}

/**
 * Defines a custom validation rule for form fields.
 * Maps to Angular's built-in validators with configurable constraints.
 *
 * @property {'minLength' | 'maxLength'} type - The validation type to apply.
 * @property {number | string} [value] - The constraint value (e.g., minimum length).
 * @property {string} [message] - Custom error message displayed on validation failure.
 */
export interface IFieldValidator {
  type: 'minLength' | 'maxLength';
  value?: number | string;
  message?: string;
}

/**
 * Represents the complete configuration for a dynamic form.
 * Encapsulates metadata, field definitions, and completion state.
 *
 * @property {string} formId - Unique identifier for the form instance.
 * @property {string} consultingId - Unique identifier for the consulting session.
 * @property {string} topic - The title or subject of the form.
 * @property {string} [description] - Optional detailed description of the form's purpose.
 * @property {IFormField[]} fields - Collection of field configurations that compose the form.
 * @property {boolean} isComplete - Indicates whether all required fields have been answered.
 * @property {Record<string, any>} [metadata] - Additional custom properties for extended use cases.
 */
export interface IDynamicForm {
  formId: string;
  consultingId: string;
  topic: string;
  description?: string;
  fields: IFormField[];
  isComplete: boolean;
  shouldGenerateProposal?: boolean;
  assistantMessage?: string;
  currentArea?: IKPIArea;
  allAreas?: IKPIArea[];
  meanVelocity?: number;
}

/**
 * Represents an individual field response from the user.
 * Contains the field identifier and the user's answer.
 *
 * @property {string} idField - The unique identifier of the field being answered.
 * @property {string} response - The user's answer converted to string format.
 */
export interface IFieldResponse {
  idField: string;
  response: string;
}

/**
 * Represents the user's submission data for a completed form.
 * Contains the form identifier, field responses, consultation context, and submission timestamp.
 *
 * @property {string} consultingId - The unique identifier of the consulting session (stored as number in DB).
 * @property {string} formId - The unique identifier of the submitted form.
 * @property {IFieldResponse[]} responses - Array of field responses with structured data.
 * @property {Date} [submittedAt] - Timestamp indicating when the form was submitted.
 */
export interface IFormResponse {
  consultingId: string;
  formId: string;
  responses: IFieldResponse[];
  submittedAt?: Date;
}

/**
 * Represents the complete form submission payload sent to backend.
 * Used for POST requests to /api/consulting/send-message endpoint.
 *
 * @property {IFieldResponse[]} [responses] - Array of field responses.
 * @property {number} consultingID - The unique identifier of the consulting session (0 for first submission).
 * @property {number} formID - The unique identifier of the form (0 for first submission).
 * @property {string} [title] - Optional consultation title (used only when consultingID is 0).
 */
export interface IFormToBackend {
  responses?: IFieldResponse[];
  consultingID: number;
  formID: number;
  title?: string;
}
