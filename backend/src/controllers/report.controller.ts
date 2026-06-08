import { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { EmailService } from "../services/email.service";
import { GenResponse } from "../models/interfaces/gen_response.interface";

/**
 * Controller for report generation and management operations.
 * Handles HTTP requests related to consulting reports.
 */
export class ReportController {
  /**
   * Generates a comprehensive consulting report using AI analysis.
   * Validates consulting ownership, triggers report generation via OpenAI,
   * and returns the complete proposal with recommendations.
   *
   * @param req - Express request containing consulting ID in URL params
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse with generated report data
   */
  public static async generateReport(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingId = parseInt(req.params.id, 10);

      if (isNaN(consultingId)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      const report = await ReportService.generateReport(consultingId, userId);

      resp.code = 200;
      resp.msg = "Report generated successfully";
      resp.data = report;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in generateReport controller:", error);

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("already exists")) {
          resp.code = 409;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while generating report";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Retrieves an existing report for a specific consulting session.
   * Validates user ownership before returning the report data.
   *
   * @param req - Express request containing consulting ID in URL params
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse with report data
   */
  public static async getReportByConsultingId(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingId = parseInt(req.params.id, 10);

      if (isNaN(consultingId)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      const report = await ReportService.getReportByConsultingId(
        consultingId,
        userId,
      );

      if (!report) {
        resp.code = 404;
        resp.msg = "Report not found for this consulting session";
        resp.data = null;
        res.status(404).json(resp);
        return;
      }

      resp.code = 200;
      resp.msg = "Report retrieved successfully";
      resp.data = report;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in getReportByConsultingId controller:", error);

      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while retrieving report";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Generates complete PDF report for a completed consulting session.
   * Returns Base64 encoded PDF that frontend can decode and display.
   *
   * @param req - Express request containing consulting ID in URL params
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse with Base64 PDF and metadata
   */
  public static async generateReportDoc(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingId = parseInt(req.params.id, 10);

      if (isNaN(consultingId)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      const pdfData = await ReportService.generateReportDoc(
        consultingId,
        userId,
      );

      resp.code = 200;
      resp.msg = "PDF report generated successfully";
      resp.data = pdfData;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in generateReportDoc controller:", error);

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not yet finished")) {
          resp.code = 409;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("generate the report first")) {
          resp.code = 409;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while generating PDF";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Sends a PDF report via email to a specified recipient.
   * Generates the PDF report and emails it to the provided email address.
   *
   * @param req - Express request containing consulting ID in URL params and recipientEmail in body
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse confirming email sent
   */
  public static async sendEmailWithReport(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingId = parseInt(req.params.id, 10);
      const { recipientEmail } = req.body;

      // Validate consulting ID
      if (isNaN(consultingId)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      // Validate recipient email
      if (!recipientEmail || typeof recipientEmail !== "string") {
        resp.code = 400;
        resp.msg = "Recipient email is required";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        resp.code = 400;
        resp.msg = "Invalid email format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      // Generate PDF report
      const pdfData = await ReportService.generateReportDoc(
        consultingId,
        userId,
      );

      // Send email with PDF attachment
      await EmailService.sendEmail({
        clientEmail: recipientEmail,
        fileName: pdfData.fileName,
        pdfData: pdfData.pdfBase64,
      });

      resp.code = 200;
      resp.msg = `Report sent successfully to ${recipientEmail}`;
      resp.data = {
        sentTo: recipientEmail,
        fileName: pdfData.fileName,
        sentAt: new Date(),
      };
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in sendEmailWithReport controller:", error);

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not yet finished")) {
          resp.code = 409;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("generate the report first")) {
          resp.code = 409;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("Failed to send email")) {
          resp.code = 500;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while sending email";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }
}
