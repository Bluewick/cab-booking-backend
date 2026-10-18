import express from "express";
import {
  create_ticket,
  list_my_tickets,
  get_ticket_details,
  resolve_ticket,
} from "../controllers/support.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

// User support ticket workflows
router.post("/", create_ticket);
router.get("/my", list_my_tickets);
router.get("/:id", get_ticket_details);

// Admin resolution workflow
router.patch("/:id", authorize("admin"), resolve_ticket);

export default router;