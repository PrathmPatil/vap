import express from "express";
import { getLogsController } from "../controllers/cronLogController.js";
import { authenticate, requireMaster } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, requireMaster, getLogsController);

export default router;