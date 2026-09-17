import express from "express";
import {
  proxyBhavcopyHealth,
  proxyFetchDateWithFormulas,
  proxyFetchRangeWithFormulas,
} from "../controllers/manualBhavcopyController.js";
import { authenticate, requireMaster } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/health", authenticate, requireMaster, proxyBhavcopyHealth);

router.post(
  "/fetch-date-with-formulas/:date",
  authenticate,
  requireMaster,
  proxyFetchDateWithFormulas
);

router.post(
  "/fetch-range-with-formulas",
  authenticate,
  requireMaster,
  proxyFetchRangeWithFormulas
);

export default router;
