import express from "express";

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

router.post("/run-formula-engine", runFormulaEngine);

router.get("/meta", getFormulaMeta);
router.post("/query", queryFormula);

router.get("/meta/:formulaType/dates", getFormulaAvailableDates);
router.get("/meta/:formulaType/companies", getFormulaCompanies);

router.post("/strong-bullish-candle", generateStrongBullish);
router.post("/bearish-candle", generateBearishCandle);
router.post("/gap-up-day", generateGapUpDay);
router.post("/gap-down-day", generateGapDownDay);
router.post("/fifty-two-week-high", generateFiftyTwoWeekHigh);
router.post("/top-gainer-day", generateTopGainerDay);
router.post("/band-hit-52w", generateBandHit52w);
router.post("/top-loser-day", generateTopLoserDay);
router.post("/fifty-two-week-low", generateFiftyTwoWeekLow);
router.post("/daily-mover-up", generateDailyMoverUp);
router.post("/daily-mover-down", generateDailyMoverDown);

router.post("/rally-attempt-day", runRallyAttempt);

router.post("/follow-through-day", runFollowThroughDay);

router.post("/buy-day", runBuyDay);

// getVolumeBreakouts
router.post("/volume-breakouts", getVolumeBreakouts);

// getTweezerBottoms
router.post("/tweezer-bottoms", getTweezerBottomPatterns);

// Get saved patterns from database
router.post('/tweezer-bottom/signals', getSavedTweezerBottomSignals);


export default router;