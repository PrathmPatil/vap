import express from "express";
import {
  fetchIpoData,
  fetchNseIpoCounts,
  fetchNseIpoData,
  fetchReportsCount,
} from "../controllers/ipoController.js";

const router = express.Router();

router.get("/nse/counts", fetchNseIpoCounts);
router.get("/nse", fetchNseIpoData);
router.post("/finnhub/reportsCount", fetchReportsCount);
router.post("/sync", async (req, res) => {
  const { syncIpoData } = await import("../controllers/syncController.js");
  return syncIpoData(req, res);
});
router.get("/:reportType", fetchIpoData);

export default router;
