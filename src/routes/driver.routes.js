import express from "express";
import {
  register_driver_profile,
  get_driver_profile,
  update_driver_status,
} from "../controllers/driver.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

router.post("/register", register_driver_profile);
router.get("/me", authorize("driver", "admin"), get_driver_profile);
router.patch("/status", authorize("driver", "admin"), update_driver_status);

export default router;