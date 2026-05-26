import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({name: 'company'})
export class Company {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    size!: string;

    @Column()
    sector!: string;

    @OneToOne(() => User, (user) => user.company, { onDelete: 'CASCADE' })
    
    @JoinColumn()
    user!: User;
}