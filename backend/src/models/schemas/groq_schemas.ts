import { z } from "zod";
import { ResponseType } from "../enums/response_type.enum";

/**
 * Validation schema for form field validators
 * Supports only minLength (maxLength is managed automatically in backend)
 */
const ValidatorSchema = z.object({
  type: z
    .enum(["minLength"])
    .describe("Type of validation rule. MANDATORY for 'textarea' inputs."),
  value: z
    .union([z.string(), z.number()])
    .describe("The validation threshold value (e.g., 10, 100, '^[a-z]+$')."),
  message: z
    .string()
    .nullable()
    .describe(
      "Optional custom error message in Spanish to show if validation fails." +
        "Bad: Error de validación. Good: Para entender tu proceso, necesitamos una explicación más detallada que una sola frase.",
    ),
});

/**
 * Schema for an individual dynamic form field
 * Defines the structure and validations of each AI-generated question
 */
const FormFieldSchema = z.object({
  idField: z
    .string()
    .describe(
      "Short, unique semantic ID in snake_case summarizing the question topic (e.g., 'sales_volume', 'crm_name').",
    ),
  question: z
    .string()
    .describe(
      "The question text to be displayed to the user, written in Spanish (Spain).",
    ),
  placeholder: z
    .string()
    .describe(
      "Short placeholder text in Spanish to guide the user what an answer could be (e.g., 'Ex: 50.000€', 'Write here...').",
    ),
  type: z
    .enum(["select", "textarea", "multiselect"])
    .describe(
      "Input type used for frontend rendering. Use 'select' for single choice, 'multiselect' for multiple choice, 'textarea' for open text.",
    ),
  required: z.boolean().describe("Is the field mandatory in the form?"),
  options: z
    .array(z.string())
    .nullable()
    .describe(
      "Array of string options in Spanish. Required if type='select' or 'multiselect', otherwise null.",
    ),
  validators: z
    .array(ValidatorSchema)
    .nullable()
    .describe(
      "List of validators (minLength, maxLength) or null if none apply.",
    ),
});

// --- KPI & PHASE SCHEMAS ---

/**
 * Schema for area detection during initialization
 */
const AreaDetectedSchema = z.object({
  name: z.string().describe("Name of the detected area"),
  initial_score: z.number().min(0).max(2).describe("Initial knowledge score."),
  summary: z
    .string()
    .describe("Brief justification of why this area was created"),
});

/**
 * Schema for KPI tracking metrics
 * Used by the backend to measure agent performance and logic flow
 */
const KpiAnalysisSchema = z.object({
  new_score: z.number().min(0).max(10).describe("Updated knowledge score."),
  useful_answers_count: z.number().describe("Count of helpful user responses "),
  updated_summary: z
    .string()
    .describe(
      "Incremental summary of the problem in Spanish. " +
        "Must fuse the previous summary with the new findings from the latest answers.",
    ),
});

/**
 * Schema Phase 1: Init (Areas + Questions)
 * Returns detected areas + initial questions
 */
export const InitResponseSchema = z.object({
  areas_detected: z
    .array(AreaDetectedSchema)
    .min(2)
    .describe(
      "List of specific problem areas. " +
        "Include the 'Specific Selection' area and extract distinct areas (eg: Technology, Personnel, Process) from the 'Description'.",
    ),
  questions: z
    .array(FormFieldSchema)
    .max(5)
    .describe(
      "Initial set of exploratory questions focused on the primary area.",
    ),
  assistantMessage: z
    .string()
    .default("")
    .describe(
      "Feedback message in Spanish (MAX 90 chars, NO word truncation). " +
        "Evaluate response quality and motivate the user. " +
        "If responses are detailed/useful: 'Muy bien, sigamos así para profundizar más' (positive reinforcement). " +
        "If responses are vague/incomplete: 'Necesito más detalles específicos para ayudarte mejor' (gentle encouragement). " +
        "User must understand how well they are doing. Be concise and complete sentences only.",
    ),
});

/**
 * Schema Phase 2: Follow-Up (KPIs + Questions)
 * Returns KPI analysis + next questions
 */
export const FollowUpResponseSchema = z.object({
  kpi_analysis: KpiAnalysisSchema.describe(
    "Internal analysis of progress and metrics.",
  ),
  target_area_id: z
    .string()
    .describe("The ID of the area selected for the NEXT batch of questions. "),
  questions: z
    .array(FormFieldSchema)
    .max(4)
    .describe("Next set of questions to deepen the diagnosis."),
  assistantMessage: z
    .string()
    .default("")
    .describe(
      "Feedback message in Spanish (MAX 90 chars, NO word truncation). " +
        "Evaluate response quality and motivate the user. " +
        "If responses are detailed/useful: 'Muy bien, sigamos así para profundizar más' (positive reinforcement). " +
        "If responses are vague/incomplete: 'Necesito más detalles específicos para ayudarte mejor' (gentle encouragement). " +
        "User must understand how well they are doing. Be concise and complete sentences only.",
    ),
});

/**
 * Schema for a structured key recommendation entry.
 * Each recommendation maps to an independent database record in the key_recommendation table.
 * Labels are product-oriented to highlight solution value and attract clients.
 */
const KeyRecommendationSchema = z.object({
  title: z
    .string()
    .min(10)
    .describe(
      "Short, actionable title that summarises what the client must do to resolve the identified problem. " +
        "It should read as a concrete action (e.g. 'Define a clear ideal-candidate profile and communicate it effectively').",
    ),
  description: z
    .string()
    .min(40)
    .describe(
      "In-depth explanation of the recommendation title. " +
        "Explain the rationale, expected outcome, and how it contributes to solving the problem. " +
        "Write in a professional and persuasive tone that also sells the value of the proposed solution.",
    ),
  labels: z
    .array(z.string().min(3))
    .min(1)
    .max(4)
    .describe(
      "Product-oriented labels that categorise this recommendation (e.g. 'Talent Management', 'Process Automation', 'Digital Transformation'). " +
        "Labels should be compelling, marketable, and highlight the business value of the solution.",
    ),
});

export type InitResponse = z.infer<typeof InitResponseSchema>;
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;

function buildResponseFormat(schemaName: string, schema: z.ZodTypeAny) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: schemaName,
      strict: true,
      schema: z.toJSONSchema(schema),
    },
  };
}

export function getResponseFormat(responseType: ResponseType) {
  switch (responseType) {
    case ResponseType.INIT:
      return buildResponseFormat("init_response", InitResponseSchema);
    case ResponseType.FOLLOW_UP:
      return buildResponseFormat("followup_response", FollowUpResponseSchema);
    default:
      throw new Error(`Unknown response type: ${responseType}`);
  }
}
