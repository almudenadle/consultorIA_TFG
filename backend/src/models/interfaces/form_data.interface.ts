import { IFormFieldToSend, IFormFieldToRecieve } from "./form_field.interface";
import { ConsultingStatus } from "../enums/consulting_status.enum";

/**
 * Represents a complete form submission received from the client.
 * Contains answered questions associated with a consulting session.
 *
 * @property questions - Array of answered form fields
 * @property consultingID - ID linking the form to a consulting session (can be 0 for first form submission)
 * @property title - Optional title for new consultation (used when consultingID is 0)
 */
export interface IFormToRecieve {
  responses?: IFormFieldToRecieve[];
  consultingID: number;
  formID: number;
  title?: string;
}

/**
 * Represents a form to be sent to the client for completion.
 * Contains the next set of questions for a consulting session.
 *
 * @property questions - Array of form fields to be rendered
 * @property consultingID - ID linking the form to a consulting session
 */
export interface IFormToSend {
  consultingID: number;
  formID: number;
  questions: IFormFieldToSend[];
  isFirstForm: boolean;
  assistantMessage?: string;
  currentArea?: IAreaDataToSend;
  allAreas?: IAreaDataToSend[];
  meanVelocity: number;
}

export interface IAreaDataToSend {
  id: string;
  name: string;
  actualScore: number;
  previousScore: number;
  status: string;
}

/**
 * Represents a consulting session in list view.
 * Includes calculated average score from all KPI areas.
 *
 * @property id - Consulting session identifier
 * @property title - Consulting session title
 * @property date - Creation date
 * @property statusCons - Current status of the consulting session
 * @property lastTimeAccessed - Last access timestamp
 * @property averageScore - Calculated average of all area scores from kpiData
 */
export interface IConsultingListItem {
  id: number;
  title: string;
  date: Date;
  statusCons: ConsultingStatus;
  lastTimeAccessed: Date;
  averageScore: number;
}
