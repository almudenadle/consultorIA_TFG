import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import authenticate from "../middlewares/authenticate.middleware";

const router = Router();

router.post("/create-user-and-company", UserController.createUserAndCompany);
router.post("/login", UserController.authenticateUser);
router.get("/email", authenticate, UserController.getUserEmail);
router.get("/profile", authenticate, UserController.getProfile);
router.patch("/profile", authenticate, UserController.updateProfile);
router.patch("/company", authenticate, UserController.updateCompany);
router.post("/change-password", authenticate, UserController.changePassword);
router.get("/:id", authenticate, UserController.getUserById);

export default router;
