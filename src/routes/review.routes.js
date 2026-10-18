import express from "express";
import { submit_review, list_driver_reviews } from "../controllers/review.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate_user, authorize("rider", "admin"), submit_review);
router.get("/driver/:driver_id", authenticate_user, list_driver_reviews);

export default router;