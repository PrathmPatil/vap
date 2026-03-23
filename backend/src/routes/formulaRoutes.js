import express from "express";
import { generateStrongBullish, runFormulaEngine } from "../controllers/formulaController.js";

const router = express.Router();


router.get("/run-formula", runFormulaEngine);
// generateStrongBullish
router.get("/generate-strong-bullish", generateStrongBullish);
// router.post("/run-formula", runFormulaEngine);

export default router;