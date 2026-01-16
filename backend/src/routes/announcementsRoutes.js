import express from "express";
import { getAnnouncementsController } from "../controllers/announcementsController.js";

const router = express.Router();


router.get("/", getAnnouncementsController);

export default router;
