import express from "express";
import { fetchIpoData, fetchReportsCount } from "../controllers/ipoController.js";

const router = express.Router();


router.get("/:reportType", fetchIpoData);
router.post("/finnhub/reportsCount",fetchReportsCount);

export default router;
