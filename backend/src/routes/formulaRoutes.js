import express from "express";
import { runFormulaEngine } from "../controllers/formulaController.js";

const router = express.Router();


router.get("/run-formula", runFormulaEngine);

export default router;