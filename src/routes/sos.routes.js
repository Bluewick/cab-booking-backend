import express from "express";
import {
  trigger_sos,
  resolve_sos,
  list_active_sos_alerts,
} from "../controllers/sos.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

// Passenger and Driver emergency trigger
router.post("/trigger", trigger_sos);

// Admin incident management
router.get("/active", authorize("admin"), list_active_sos_alerts);
router.patch("/:id/resolve", authorize("admin"), resolve_sos);

export default router;