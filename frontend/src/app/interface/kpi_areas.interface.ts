import { StatusArea } from '../models/enums/kpi_status.enum';

/**
 * Interface representing a Key Performance Indicator (KPI) area.
 * Defines the data structure for areas evaluated in consulting processes.
 */
export interface IKPIArea {
  id: string;
  name: string;
  actualScore: number;
  status: StatusArea;
  previousScore: number;
}
