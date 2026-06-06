import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { Company } from './company.entity';
import { Consulting } from './consulting.entity';
import { AccessLog } from './access_log.entity';
import { Report } from './report.entity';



@Entity({name: 'user'})
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  userId!: string;

  @Column({ unique: true })
  mail!: string;

  @Column()
  password!: string;

  // 1:1 Relationship with Company
  @OneToOne(() => Company, (company) => company.user, { cascade: true })
    company!: Company;

  // 1:N Relationship with Consulting
  @OneToMany(() => Consulting, (consulting) => consulting.user, { cascade: true })
    consultings!: Consulting[];

  // 1:N Relationship with Report
  @OneToMany(() => Report, (report) => report.user, { cascade: true })
    reports!: Report[];

  @OneToMany(() => AccessLog, (log) => log.user, { cascade: true })
    accessLogs!: AccessLog[];
}