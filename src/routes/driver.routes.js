import express from "express";
import {
  register_driver_profile,
  get_driver_profile,
  update_driver_status,
  list_pending_drivers,
  list_all_drivers_admin,
  get_driver_details_admin,
  verify_driver_admin,
} from "../controllers/driver.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

// Driver profile operations
router.post("/register", register_driver_profile);
router.get("/me", authorize("driver", "admin"), get_driver_profile);
router.patch("/status", authorize("driver", "admin"), update_driver_status);

// Admin driver verification and inspection operations
router.get("/pending", authorize("admin"), list_pending_drivers);
router.get("/", authorize("admin"), list_all_drivers_admin);
router.get("/:id", authorize("admin"), get_driver_details_admin);
router.patch("/:id/verify", authorize("admin"), verify_driver_admin);

export default router;