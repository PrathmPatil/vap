import express from "express";
import { fetchIpoData } from "../controllers/ipoController.js";

const router = express.Router();


router.get("/:reportType", fetchIpoData);

export default router;
