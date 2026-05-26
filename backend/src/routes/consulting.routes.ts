import { Router } from "express";
import { ConsultingController } from "../controllers/consulting.controller";

const router = Router();

router.get("/get-initial-form", ConsultingController.getInitialForm);
router.get("/get-all-consultings", ConsultingController.getAllConsultings);
router.post("/send-message", ConsultingController.sendMessage);
router.get("/get-consulting/:id", ConsultingController.getConsultingById);
router.delete("/delete/:id", ConsultingController.deleteConsulting);
router.post("/set-title", ConsultingController.setTitle);

export default router;
