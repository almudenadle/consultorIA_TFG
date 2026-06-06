import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Consulting } from "./consulting.entity";
import { User } from "./user.entity";
import { KeyRecommendation } from "./key_recommendation.entity";

//IEstimatedImpact
import { IEstimatedImpact } from "../models/interfaces/report_data.interface";

/**
 * Represents a generated consulting report containing analysis summary and recommendations.
 *
 * This entity stores the final output of a consulting session, including an executive summary
 * and actionable proposals. Each report is uniquely associated with one consulting session
 * and belongs to a specific user.
 *
 * @entity
 * @table report
 *
 * @example
 * const report = new Report();
 * report.summary = "Analysis of customer's business model indicates...";
 * report.proposal = "Recommended actions: 1. Improve digital presence...";
 * report.consulting = consultingInstance;
 * report.user = userInstance;
 * await reportRepository.save(report);
 */
@Entity({ name: "report" })
export class Report {
  /**
   * Unique identifier for the report.
   *
   * Auto-generated primary key that uniquely identifies each report in the database.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Executive summary of the consulting analysis.
   *
   * Contains a comprehensive overview of the findings, key insights, and diagnostic
   * conclusions derived from the consulting session interactions and data analysis.
   */
  @Column({ type: "text" })
  summary!: string;

  /**
   * Actionable recommendations and strategic proposals.
   *
   * Provides specific, implementable suggestions tailored to address the identified
   * challenges and opportunities discovered during the consulting process.
   */
  @Column({ type: "text" })
  proposal!: string;

  /**
   * Executive conclusion summarizing all report findings.
   *
   * A high-level synthesis that combines the problem summary, proposal, key recommendations,
   * and detected areas into a concise executive overview. Designed for quick comprehension
   * using bullet points and narrative paragraphs, enabling decision-makers to grasp
   * the full scope without reading the entire report.
   */
  @Column({ type: "text" })
  conclusion!: string;

  /**
   * Timestamp when the report was generated.
   *
   * Automatically set to the current database timestamp when the report record is created.
   * Useful for tracking report generation history and audit trails.
   */
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
  


  /**
   * Key recommendations associated with this report.
   *
   * One-to-many relationship with {@link KeyRecommendation}.
   * Each recommendation holds a title, a detailed description, and product-oriented labels.
   * Records are persisted individually and grouped by reportId on retrieval.
   *
   * @relation OneToMany
   */
  @OneToMany(
    () => KeyRecommendation,
    (keyRecommendation) => keyRecommendation.report,
    { cascade: true, eager: false },
  )
  keyRecommendations!: KeyRecommendation[];

  /**
   * Estimated impact of the recommendations.
   *
   * Provides an assessment of the potential benefits or changes expected
   * if the recommendations are implemented, helping stakeholders gauge value.
   */
  @Column({ type: "json", nullable: true })
  estimatedImpact?: IEstimatedImpact;

  /**
   * Associated consulting session that generated this report.
   *
   * One-to-one relationship with the {@link Consulting} entity. Each report is generated
   * from exactly one consulting session. When the consulting session is deleted, this
   * report is automatically removed (CASCADE deletion).
   *
   * @relation OneToOne
   * @cascade onDelete: CASCADE
   */
  @OneToOne(() => Consulting, (consulting) => consulting.report, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  consulting!: Consulting;

  /**
   * User who owns this report.
   *
   * Many-to-one relationship with the {@link User} entity. A user can have multiple reports,
   * but each report belongs to exactly one user. When the user is deleted, all associated
   * reports are automatically removed (CASCADE deletion).
   *
   * @relation ManyToOne
   * @cascade onDelete: CASCADE
   */
  @ManyToOne(() => User, (user) => user.reports, { onDelete: "CASCADE" })
  user!: User;
}
