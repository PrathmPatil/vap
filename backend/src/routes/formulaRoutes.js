import express from "express";
import {
  authenticate,
  requireMaster,
  authenticateMasterOrInternal,
} from "../middlewares/auth.middleware.js";

import {
  runFormulaEngine,
  generateStrongBullish,
  generateBearishCandle,
  generateGapUpDay,
  generateGapDownDay,
  generateFiftyTwoWeekHigh,
  generateTopGainerDay,
  generateBandHit52w,
  generateTopLoserDay,
  generateFiftyTwoWeekLow,
  generateDailyMoverUp,
  generateDailyMoverDown,
  runRallyAttempt,
  runFollowThroughDay,
  runBuyDay,
  getVolumeBreakouts,
  getTweezerBottomPatterns,
  getSavedTweezerBottomSignals,
  getFormulaAvailableDates,
  getFormulaCompanies,
  getFormulaMeta,
  queryFormula
} from "../controllers/formulaController.js";

const router = express.Router();
const adminOnly = [authenticate, requireMaster];

// Python bhavcopy cron uses INTERNAL_API_KEY; master UI uses JWT
router.post(
  "/run-formula-engine",
  authenticateMasterOrInternal,
  runFormulaEngine
);

router.get("/meta", getFormulaMeta);
router.post("/query", queryFormula);

router.get("/meta/:formulaType/dates", getFormulaAvailableDates);
router.get("/meta/:formulaType/companies", getFormulaCompanies);

router.post("/strong-bullish-candle", ...adminOnly, generateStrongBullish);
router.post("/bearish-candle", ...adminOnly, generateBearishCandle);
router.post("/gap-up-day", ...adminOnly, generateGapUpDay);
router.post("/gap-down-day", ...adminOnly, generateGapDownDay);
router.post("/fifty-two-week-high", ...adminOnly, generateFiftyTwoWeekHigh);
router.post("/top-gainer-day", ...adminOnly, generateTopGainerDay);
router.post("/band-hit-52w", ...adminOnly, generateBandHit52w);
router.post("/top-loser-day", ...adminOnly, generateTopLoserDay);
router.post("/fifty-two-week-low", ...adminOnly, generateFiftyTwoWeekLow);
router.post("/daily-mover-up", ...adminOnly, generateDailyMoverUp);
router.post("/daily-mover-down", ...adminOnly, generateDailyMoverDown);

router.post("/rally-attempt-day", ...adminOnly, runRallyAttempt);

router.post("/follow-through-day", ...adminOnly, runFollowThroughDay);

router.post("/buy-day", ...adminOnly, runBuyDay);

router.post("/volume-breakouts", ...adminOnly, getVolumeBreakouts);

router.post("/tweezer-bottoms", ...adminOnly, getTweezerBottomPatterns);

router.post('/tweezer-bottom/signals', ...adminOnly, getSavedTweezerBottomSignals);


export default router;