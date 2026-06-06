/**
 * Represents a single key recommendation sent to the frontend.
 * Mirrors the key_recommendation database entity.
 */
export interface IKeyRecommendation {
  /** Database primary key of the recommendation record. */
  id: number;

  /** Short, actionable title summarising the recommendation. */
  title: string;

  /** In-depth explanation of the recommendation and its expected outcome. */
  description: string;

  /** Product-oriented labels used to categorise the recommendation. */
  labels: string[];

  /** Foreign key referencing the parent report. */
  reportId: number;
}

/**
 * Estimated impact metrics for the proposed solution.
 * Provides strategic assessment of implementation timeline, complexity, and investment.
 */
export interface IEstimatedImpact {
  /**
   * Expected implementation timeframe.
   * - corto_plazo: 1-3 months
   * - medio_plazo: 3-12 months
   * - largo_plazo: >12 months
   */
  timeframe: "corto_plazo" | "medio_plazo" | "largo_plazo";

  /**
   * Technical and organizational complexity level.
   * - baja: Simple implementation, minimal dependencies
   * - media: Moderate complexity, some integration needed
   * - alta: Complex implementation, significant organizational change
   */
  complexity: "baja" | "media" | "alta";

  /**
   * Required economic investment level relative to business size.
   * - bajo: <10% of relevant budget
   * - moderado: 10-30% of relevant budget
   * - alto: >30% of relevant budget
   */
  investmentLevel: "bajo" | "moderado" | "alto";
}

/**
 * Complete report data structure sent to the frontend.
 * Contains the final consulting output including summary, proposal, and recommendations.
 */
export interface IReportToSend {
  /**
   * Unique identifier of the generated report in the database.
   */
  reportId: number;

  /**
   * Executive summary of the identified problem (100-1000 characters).
   * Includes business context, main diagnosis, and critical areas detected.
   */
  summary: string;

  /**
   * Detailed solution proposal with technical justification and implementation steps (minimum 500 characters).
   * Includes feasibility analysis, required resources, estimated timeline, expected benefits, and risks.
   */
  proposal: string;

  /**
   * Executive conclusion that synthesizes all report findings (500-3000 characters).
   * Combines summary, proposal, key recommendations, and detected areas into a concise executive overview.
   * Format: 3-7 bullet points followed by 2-4 narrative paragraphs.
   * Designed for quick comprehension by busy executives without reading the full report.
   */
  conclusion: string;

  /**
   * Structured key recommendations derived from the consulting proposal.
   * Each entry is stored as an independent record in the key_recommendation table.
   */
  keyRecommendations: IKeyRecommendation[];

  /**
   * Strategic estimation of impact, timeframe, and required resources.
   */
  estimatedImpact: IEstimatedImpact;

  /**
   * Timestamp when the report was generated.
   */
  createdAt: Date;
}
