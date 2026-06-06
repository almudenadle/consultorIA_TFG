/**
 * Single key recommendation returned by the report API.
 */
export interface IKeyRecommendation {
  /** Database record ID. */
  id: number;
  /** Short, actionable title. */
  title: string;
  /** In-depth explanation of the recommendation. */
  description: string;
  /** Product-oriented category labels. */
  labels: string[];
  /** ID of the parent report this recommendation belongs to. */
  reportId: number;
}

/**
 * Interface for the estimated impact of the consulting proposal
 * Contains timeframe, complexity and investment level information
 */
export interface IEstimatedImpact {
  /**
   * Expected implementation timeframe
   * - corto_plazo: 1-3 months
   * - medio_plazo: 3-12 months  
   * - largo_plazo: >12 months
   */
  timeframe: 'corto_plazo' | 'medio_plazo' | 'largo_plazo';
  
  /**
   * Technical and organizational complexity
   * - baja: straightforward implementation
   * - media: requires coordination
   * - alta: complex transformation
   */
  complexity: 'baja' | 'media' | 'alta';
  
  /**
   * Required economic investment level
   * - bajo: <10% annual budget
   * - moderado: 10-30%
   * - alto: >30%
   */
  investmentLevel: 'bajo' | 'moderado' | 'alto';
}

/**
 * Main interface for consulting proposal response from backend
 * Contains executive summary, detailed proposal, key recommendations and impact estimation
 */
export interface IConsultingProposal {
  /**
   * Executive summary of the identified problem
   * Length: 100-1000 characters
   * Includes: business context, main diagnosis, and critical detected areas
   */
  summary: string;
  
  /**
   * Detailed solution proposal with technical justification
   * Minimum length: 500 characters
   * Must include:
   * 1) Feasibility analysis
   * 2) Required resources (human, technical, financial)
   * 3) Estimated timeline with key milestones
   * 4) Quantifiable expected benefits
   * 5) Risk considerations and mitigation strategies
   */
  proposal: string;
  
  /**
   * Array of 3-7 key recommendations prioritized by impact.
   * Each recommendation has a title, detailed description and category labels.
   */
  keyRecommendations: IKeyRecommendation[];
  
  /**
   * Estimation of impact, timeframe and resources needed for the proposed solution
   */
  estimatedImpact: IEstimatedImpact;
}