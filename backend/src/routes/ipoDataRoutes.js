import express from "express";
import { fetchIpoData, fetchReportsCount } from "../controllers/ipoController.js";

const router = express.Router();

router.post("/finnhub/reportsCount", fetchReportsCount);
router.post("/sync", async (req, res) => {
  const { syncIpoData } = await import("../controllers/syncController.js");
  return syncIpoData(req, res);
});
router.get("/:reportType", fetchIpoData);

export default router;
