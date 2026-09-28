import express from "express";
import axios from "axios";
import { authenticate } from "../middlewares/auth.middleware.js";

const PYTHON_API_URL = (process.env.PYTHON_API_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");

const pythonClient = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 300000,
});

const router = express.Router();

router.get("/routes", authenticate, async (_req, res) => {
  try {
    const response = await pythonClient.get("/ingest/nse-routes");
    return res.status(200).json({ success: true, ...response.data });
  } catch (error) {
    return res.status(error.response?.status || 502).json({
      success: false,
      message: error.response?.data?.detail || error.message,
    });
  }
});

router.get("/company-dossier/:symbol", authenticate, async (req, res) => {
  try {
    const symbol = encodeURIComponent(String(req.params.symbol || "").trim());
    const response = await pythonClient.get(`/ingest/company-dossier/${symbol}`);
    return res.status(200).json({ success: true, ...response.data });
  } catch (error) {
    return res.status(error.response?.status || 502).json({
      success: false,
      message: error.response?.data?.detail || error.message,
    });
  }
});

router.post("/ingest-filings", authenticate, async (req, res) => {
  try {
    const response = await pythonClient.post("/ingest/financial-filings", null, {
      params: req.query,
      timeout: 30000,
    });
    return res.status(200).json({ success: true, ...response.data });
  } catch (error) {
    return res.status(error.response?.status || 502).json({
      success: false,
      message: error.response?.data?.detail || error.message,
    });
  }
});

router.post("/ingest-filings/:symbol", authenticate, async (req, res) => {
  try {
    const symbol = encodeURIComponent(String(req.params.symbol || "").trim());
    const response = await pythonClient.post(
      `/ingest/financial-filings/${symbol}`,
      null,
      { params: req.query, timeout: 30000 }
    );
    return res.status(200).json({ success: true, ...response.data });
  } catch (error) {
    return res.status(error.response?.status || 502).json({
      success: false,
      message: error.response?.data?.detail || error.message,
    });
  }
});

export default router;
