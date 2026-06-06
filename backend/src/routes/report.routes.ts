import { Router } from "express";
import { ReportController } from "../controllers/report.controller";

const router = Router();

/**
 * POST /generate/:id
 * Generates a comprehensive consulting report using AI analysis
 * Requires authentication
 */
router.post("/generate/:id", ReportController.generateReport);

/**
 * GET /get-report/:id
 * Retrieves an existing report by consulting ID
 * Requires authentication
 */
router.get("/get-report/:id", ReportController.getReportByConsultingId);

/**
 * GET /pdf/:id
 * Generates PDF report structure for frontend rendering
 * Requires authentication and completed consulting session
 */
router.get("/pdf/:id", ReportController.generateReportDoc);

/**
 * POST /send-email/:id
 * Sends PDF report via email to specified recipient
 * Requires authentication, completed consulting session, and recipientEmail in body
 * Body: { recipientEmail: string }
 */
router.post("/send-email/:id", ReportController.sendEmailWithReport);

export default router;
