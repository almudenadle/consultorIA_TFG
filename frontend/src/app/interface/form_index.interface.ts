/**
 * Represents a navigational entry in the consulting session's form index.
 *
 * This interface serves as a lightweight view model for rendering the form
 * navigation sidebar or progress tracker in the consulting workflow. It contains
 * only the essential metadata required to display form status and enable
 * navigation between different stages of the consulting process.
 *
 * @remarks
 * Each consulting session consists of an initial diagnostic form followed by
 * multiple KPI-specific forms. This interface abstracts the navigation state
 * for both form types without carrying the full form data payload.
 */
export interface IFormIndexEntry {
  formNumber: number;
  areaName: string;
  isActive: boolean;
  isCompleted: boolean;
}
