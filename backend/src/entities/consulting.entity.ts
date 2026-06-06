import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  ManyToOne,
} from "typeorm";
import { Form } from "./form.entity";
import { ConsultingStatus } from "../models/enums/consulting_status.enum";
import { User } from "./user.entity";
import { Report } from "./report.entity";
import { ConsultingKpiArea } from "./consulting_kpi_area.entity";

@Entity({ name: "consulting" })
export class Consulting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  title!: string;

  @Column({ nullable: true })
  threadID!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  date!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastTimeAccessed!: Date;

  @Column({ type: "int", default: 0 })
  numQuestions!: number;

  /**
   * Mean velocity representing the rate of knowledge improvement for the last analyzed area.
   *
   * Calculated using a weighted formula after each follow-up exchange:
   * - Per area: velocityPerArea = (actualScore - previousScore) / sqrt(numQuestions)
   * - Overall: meanVelocity = average of all area velocities
   */
  @Column({ type: "float", default: 0 })
  meanVelocity!: number;

  @Column({ type: "text", nullable: true })
  lastAssistantMessage!: string;

  @Column({
    type: "enum",
    enum: ConsultingStatus,
    default: ConsultingStatus.ACTIVE,
  })
  statusCons!: ConsultingStatus;

  // N:1 Relationship with User
  @ManyToOne(() => User, (user) => user.consultings, { onDelete: "CASCADE" })
  user!: User;

  // 1:N Relationship with Form
  @OneToMany(() => Form, (form) => form.consulting, { cascade: true })
  forms!: Form[];

  // 1:1 Relationship with Report
  @OneToOne(() => Report, (report) => report.consulting, { cascade: true })
  report!: Report;

  // 1:N Relationship with ConsultingKpiArea
  @OneToMany(() => ConsultingKpiArea, (area) => area.consulting, {
    cascade: true,
  })
  areas!: ConsultingKpiArea[];
}
