/**
 * Interface for PDF report response sent to frontend
 * Contains Base64 encoded PDF and metadata for download
 */
export interface IPdfReportData {
  pdfBase64: string;
  fileName: string;
  metadata: {
    title: string;
    generatedAt: Date;
    reportId: number;
    consultingId: number;
  };
}
