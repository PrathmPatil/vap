import express from "express";
import { getAllYFinanceData, getUniqueSectors, getYFinanceData } from "../controllers/yFinanceController.js";

const router = express.Router();

// Fetch specific company by symbol
router.get("/yfinance/:symbol", getYFinanceData);

// (optional) fetch all companies
router.get("/yfinance", getAllYFinanceData);

// getUniqueSectors
router.get("/yfinance/sectors/unique", getUniqueSectors);


export default router;
