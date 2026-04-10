import express from "express";
import { getHolidaysController } from "../controllers/marketHolidayController.js";

const router = express.Router();

router.post("/", getHolidaysController);

export default router;