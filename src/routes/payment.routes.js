import express from "express";
import {
  create_payment_order,
  verify_payment,
  get_ride_receipt,
  get_driver_earnings,
} from "../controllers/payment.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

// Passenger payment actions
router.post("/create-order", authorize("rider", "admin"), create_payment_order);
router.post("/verify", authorize("rider", "admin"), verify_payment);

// Shared receipt action
router.get("/receipt/:ride_id", get_ride_receipt);

// Driver settlement ledger action
router.get("/earnings", authorize("driver", "admin"), get_driver_earnings);

export default router;