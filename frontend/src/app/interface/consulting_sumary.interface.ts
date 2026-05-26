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
 * @property hasReport - Indicates if a report has been generated
 */
export interface ConsultingSummary {
  id: number;
  title: string;
  date: Date;
  statusCons: number;
  lastTimeAccessed: Date;
  averageScore: number;
}
