export enum StatusArea {
  // Área detectada pero aún no se ha llegado a la nota mínima (8) del KPI.
  // Además, tampoco el último formulario enviado corresponde a este área.
  PENDING,
  // El último formulario enviado corresponde al área actual.
  IN_PROGRESS,
  // Ya se ha llegado a la nota mínima.
  COMPLETED,
}