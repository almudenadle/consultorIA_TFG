import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

/**
 * Represents a single key recommendation associated with a consulting report.
 *
 * Each record holds a concise action title, a detailed description, and a set
 * of product-oriented labels used for categorisation and frontend display.
 * Multiple recommendations can belong to the same report and are retrieved
 * grouped by reportId.
 *
 * @entity
 * @table key_recommendation
 */
@Entity({ name: "key_recommendation" })
export class KeyRecommendation {
  /** Auto-generated primary key. */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Short, actionable title summarising the recommendation.
   * Maps to the action the client should take to resolve the identified problem.
   */
  @Column({ type: "varchar", length: 255 })
  title!: string;

  /**
   * In-depth explanation of the recommendation title.
   * Provides context, rationale, and expected outcome to guide implementation.
   */
  @Column({ type: "text" })
  description!: string;

  /**
   * Product-oriented labels used to categorise the recommendation.
   * Stored as a JSON array of strings (e.g. ["Process Optimisation", "Talent Management"]).
   * Labels are designed to be compelling and highlight the value of the solution.
   */
  @Column({ type: "json" })
  labels!: string[];

  /**
   * Foreign key referencing the parent report.
   * Used to group all recommendations that belong to the same report.
   */
  @Column({ name: "reportId" })
  reportId!: number;

}
