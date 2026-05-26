/**
 * Generic API response wrapper.
 *
 * This interface represents the standard response structure from the backend API.
 * All API endpoints should return data wrapped in this format for consistency.
 *
 * @template T - The type of the data payload returned by the API.
 *
 * @property {string} msg - Response message from the server (e.g., "Profile retrieved successfully").
 * @property {number} code - HTTP status code (e.g., 200, 201, 400, 404, 500).
 * @property {T} data - The actual data payload returned by the endpoint.
 *
 */
export interface ApiResponse<T> {
  msg: string;
  code: number;
  data: T;
}
