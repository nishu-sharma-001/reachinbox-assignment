import { Router } from "express";
import {
  scheduleEmail,
  getEmails,
  searchEmails,
  getEmailStats,
} from "../controllers/emailController";


const router = Router();

router.post("/schedule", scheduleEmail);
router.get("/", getEmails);
router.get("/search", searchEmails);
router.get("/stats", getEmailStats);

export default router;