import express from "express";

import {
  runFormulaEngine,
  generateStrongBullish,
  runRallyAttempt,
  runFollowThroughDay,
  runBuyDay,
  getVolumeBreakouts
} from "../controllers/formulaController.js";

const router = express.Router();

router.post("/run-formula-engine", runFormulaEngine);

router.post("/strong-bullish-candle", generateStrongBullish);

router.post("/rally-attempt-day", runRallyAttempt);

router.post("/follow-through-day", runFollowThroughDay);

router.post("/buy-day", runBuyDay);

// getVolumeBreakouts
router.get("/volume-breakouts", getVolumeBreakouts);

export default router;