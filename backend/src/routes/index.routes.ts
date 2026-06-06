import { Router } from "express";
import UserRoutes from "./user.routes";
import ConsultingRoutes from "./consulting.routes";
import ReportRoutes from "./report.routes";
import authenticate from "../middlewares/authenticate.middleware";

const router = Router();

router.use("/user", UserRoutes);
router.use("/consulting", authenticate, ConsultingRoutes);
router.use("/report", authenticate, ReportRoutes);

export default router;
