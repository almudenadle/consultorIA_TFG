import { Router } from "express";
import UserRoutes from "./user.routes";
import ConsultingRoutes from "./consulting.routes";
import authenticate from "../middlewares/authenticate.middleware";

const router = Router();

router.use("/user", UserRoutes);
router.use("/consulting", authenticate, ConsultingRoutes);

export default router;
