import express from "express";
import { register, login, sync_clerk } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/sync-clerk", sync_clerk);

export default router;