import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity("access_logs")
export class AccessLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    date!: Date;

    @Column()
    success!: boolean;

    @ManyToOne(() => User, (user) => user.accessLogs, { onDelete: 'CASCADE' })
    user!: User;
}