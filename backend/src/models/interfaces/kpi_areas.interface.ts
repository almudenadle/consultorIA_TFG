import { StatusArea } from "../enums/kpi_status.enum";

export interface IKpis {
  areas: IAreas[];
  meanVelocity: number;
}

export interface IAreas {
  id: string;
  name: string;
  actualScore: number;
  previousScore: number;
  // Número preguntas realizadas en dicha área
  numQuestions: number;
  // Contexto resumido de lo que se sabe de este área.
  summary: string;
  status: StatusArea;
}
