import express from "express";
import { getLogsController } from "../controllers/cronLogController.js";

const router = express.Router();

router.get("/", getLogsController);

export default router;