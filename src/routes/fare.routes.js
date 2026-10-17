import express from "express";
import { estimate_trip_fare, apply_trip_promo } from "../controllers/fare.controller.js";
import { authenticate_user } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fare estimation is available to calculate quotes before authentication
router.post("/estimate", estimate_trip_fare);

// Promo validation requires user authentication
router.post("/apply-promo", authenticate_user, apply_trip_promo);

export default router;