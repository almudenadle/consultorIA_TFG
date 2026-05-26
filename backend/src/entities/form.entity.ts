import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { IFormFieldToSend } from "../models/interfaces/form_field.interface";
import { Consulting } from "./consulting.entity";

@Entity({ name: "form" })
export class Form {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  areaName!: string;

  @Column({ default: false })
  isComplete!: boolean;

  @Column({ type: "json" })
  fields!: IFormFieldToSend[];

  @ManyToOne(() => Consulting, (consulting) => consulting.forms, {
    onDelete: "CASCADE",
  })
  consulting!: Consulting;
}
