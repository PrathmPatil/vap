import express from "express";
import { fetchIpoData } from "../controllers/ipoController";

const router = express.Router();


router.get("/:reportType", fetchIpoData);

export default router;
