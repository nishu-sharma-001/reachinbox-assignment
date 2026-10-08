import { Router } from "express";
import { createSender } from "../controllers/senderController";

const router = Router();

router.post("/", createSender);

export default router;