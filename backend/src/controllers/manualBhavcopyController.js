import axios from "axios";
import logger from "../config/logger.js";

const PYTHON_API_URL = (process.env.PYTHON_API_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");

const pythonClient = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000,
});

function forwardPythonError(error, res) {
  const status = error.response?.status || 502;
  const detail =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    "Python bhavcopy service unavailable";

  logger.error("Manual bhavcopy proxy error:", detail);

  return res.status(status).json({
    success: false,
    message: typeof detail === "string" ? detail : JSON.stringify(detail),
    python_base: PYTHON_API_URL,
    detail: error.response?.data || null,
  });
}

export async function proxyFetchDateWithFormulas(req, res) {
  try {
    const { date } = req.params;
    const { force_refresh = false, background = true } = req.query;

    const response = await pythonClient.post(
      `/bhavcopy/fetch-date-with-formulas/${encodeURIComponent(date)}`,
      {},
      {
        params: { force_refresh, background },
        timeout: background === "true" || background === true ? 30000 : 900000,
      }
    );

    return res.status(response.status).json({
      success: true,
      ...response.data,
    });
  } catch (error) {
    return forwardPythonError(error, res);
  }
}

export async function proxyFetchRangeWithFormulas(req, res) {
  try {
    const { start_date, end_date, force_refresh = false, background = true } =
      req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date query parameters are required",
      });
    }

    const response = await pythonClient.post(
      "/bhavcopy/fetch-range-with-formulas",
      {},
      {
        params: { start_date, end_date, force_refresh, background },
        timeout: background === "true" || background === true ? 30000 : 900000,
      }
    );

    return res.status(response.status).json({
      success: true,
      ...response.data,
    });
  } catch (error) {
    return forwardPythonError(error, res);
  }
}

export async function proxyBhavcopyHealth(req, res) {
  try {
    const response = await pythonClient.get("/bhavcopy/health", {
      timeout: 5000,
    });
    return res.status(200).json({
      success: true,
      python_base: PYTHON_API_URL,
      ...response.data,
    });
  } catch (error) {
    return forwardPythonError(error, res);
  }
}
