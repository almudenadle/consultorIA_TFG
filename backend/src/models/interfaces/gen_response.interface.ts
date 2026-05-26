/**
 * Generic response structure for standardized API responses.
 * Provides consistent format across all endpoints.
 *
 * @property code - HTTP status code (200, 400, 500, etc.)
 * @property msg - Human-readable message describing the response
 * @property data - Response payload containing requested data or error details
 */
export class GenResponse {
  public code?: number;
  public msg?: string;
  public data?: any;
}
