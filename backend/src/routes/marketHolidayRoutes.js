import express from "express";
import { getHolidaysController } from "../controllers/marketHolidayController.js";
import { syncMarketHolidays } from "../controllers/syncController.js";

const router = express.Router();

router.post("/", getHolidaysController);
router.post("/sync", syncMarketHolidays);

export default router;