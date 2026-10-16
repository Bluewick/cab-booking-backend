import express from "express";
import {
  get_current_user_profile,
  update_current_user_profile,
  list_emergency_contacts,
  create_emergency_contact,
  delete_emergency_contact,
} from "../controllers/user.controller.js";
import { authenticate_user } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate_user);

router.get("/me", get_current_user_profile);
router.patch("/me", update_current_user_profile);

router.get("/emergency-contacts", list_emergency_contacts);
router.post("/emergency-contacts", create_emergency_contact);
router.delete("/emergency-contacts/:id", delete_emergency_contact);

export default router;