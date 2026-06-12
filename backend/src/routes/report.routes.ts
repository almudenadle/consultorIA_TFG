import { Router } from "express";
import { ReportController } from "../controllers/report.controller";

const router = Router();


router.post("/generate/:id", ReportController.generateReport);

router.get("/get-report/:id", ReportController.getReportByConsultingId);

router.get("/pdf/:id", ReportController.generateReportDoc);

router.post("/send-email/:id", ReportController.sendEmailWithReport);

export default router;
