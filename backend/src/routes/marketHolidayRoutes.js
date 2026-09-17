import express from "express";
import {
  getCoverageCalendarController,
  getCoverageDateDetailController,
  getHolidaysController,
} from "../controllers/marketHolidayController.js";
import { syncMarketHolidays } from "../controllers/syncController.js";
import { authenticate, requireMaster } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/coverage-calendar", getCoverageCalendarController);
router.get(
  "/coverage-calendar/date",
  authenticate,
  requireMaster,
  getCoverageDateDetailController
);
router.post("/", getHolidaysController);
router.post("/sync", syncMarketHolidays);

export default router;