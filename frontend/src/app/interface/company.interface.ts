/**
 * Represents a company entity associated with a user.
 *
 * @property {number} [id] - Unique database identifier for the company. Optional as it's assigned by the backend.
 * @property {string} name - Official company name.
 * @property {string} size - Company size classification (e.g., '1-10', '11-50', '51-200', '201-500', '500+').
 * @property {string} sector - Industry sector or business category the company operates in.
 */
export interface Company {
  id?: number;
  name: string;
  size: string;
  sector: string;
}

/**
 * Represents the payload structure for company update requests.
 *
 * @property {string} [name] - Official company name.
 * @property {string} [size] - Company size classification.
 * @property {string} [sector] - Industry sector or business category.
 */
export interface CompanyUpdateData {
  name?: string;
  size?: string;
  sector?: string;
}

/**
 * Represents a select option for company-related dropdowns.
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Standardized company size options for use across all forms.
 */
export const COMPANY_SIZE_OPTIONS: SelectOption[] = [
  { label: '1-10 empleados', value: '1-10' },
  { label: '11-50 empleados', value: '11-50' },
  { label: '51-200 empleados', value: '51-200' },
  { label: '201-500 empleados', value: '201-500' },
  { label: 'Más de 500 empleados', value: '500+' },
];

/**
 * Standardized company sector options for use across all forms.
 */
export const COMPANY_SECTOR_OPTIONS: SelectOption[] = [
  { label: 'Tecnología', value: 'technology' },
  { label: 'Finanzas', value: 'finance' },
  { label: 'Salud', value: 'health' },
  { label: 'Retail', value: 'retail' },
  { label: 'Educación', value: 'education' },
  { label: 'Manufactura', value: 'manufacturing' },
  { label: 'Servicios', value: 'services' },
  { label: 'Otro', value: 'other' },
];
