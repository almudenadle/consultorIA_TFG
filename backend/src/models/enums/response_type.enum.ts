/**
 * Response type enumeration for identifying expected response format
 *
 * Used to dynamically determine which schema to apply when processing
 * AI-generated responses in the consulting workflow
 */
export enum ResponseType {
  /** Phase 1: Initialization (response of first form) */
  INIT = "init",
  /** Phase 2: FOLLOW_UP (KPI tracking to generate new responses) */
  FOLLOW_UP = "follow_up",
}
