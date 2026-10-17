import express from "express";
import {
  request_ride,
  accept_ride,
  driver_arrived,
  start_ride,
  complete_ride,
  cancel_ride,
  get_ride_details,
  get_ride_history,
} from "../controllers/ride.controller.js";
import { authenticate_user, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

// Rider actions
router.post("/request", authorize("rider", "admin"), request_ride);

// Shared actions (Rider, Driver, Admin)
router.get("/history", get_ride_history);
router.get("/:id", get_ride_details);
router.post("/:id/cancel", cancel_ride);

// Driver specific lifecycle actions
router.post("/:id/accept", authorize("driver", "admin"), accept_ride);
router.post("/:id/arrive", authorize("driver", "admin"), driver_arrived);
router.post("/:id/start", authorize("driver", "admin"), start_ride);
router.post("/:id/complete", authorize("driver", "admin"), complete_ride);

export default router;