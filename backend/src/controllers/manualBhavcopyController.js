import axios from "axios";
import logger from "../config/logger.js";

const PYTHON_API_URL = (process.env.PYTHON_API_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");

const pythonClient = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000,
});

function pythonErrorMessage(error) {
  const fromPython =
    error.response?.data?.detail || error.response?.data?.message;
  if (typeof fromPython === "string" && fromPython.trim() && fromPython !== "Error") {
    return fromPython;
  }
  if (Array.isArray(fromPython) && fromPython.length) {
    return fromPython.map(String).join("; ");
  }

  const code = error.code ? ` (${error.code})` : "";
  const cause = error.message && error.message !== "Error"
    ? error.message
    : "Python bhavcopy service unavailable";

  if (!error.response) {
    return `${cause}${code}. Backend tried ${PYTHON_API_URL} — set PYTHON_API_URL=http://fastapi:8080 in Docker.`;
  }
  return `${cause}${code}`;
}

function forwardPythonError(error, res) {
  const status = error.response?.status || 502;
  const message = pythonErrorMessage(error);

  logger.error("Manual bhavcopy proxy error:", message);

  return res.status(status).json({
    success: false,
    message,
    python_base: PYTHON_API_URL,
    detail: error.response?.data || {
      code: error.code || null,
      axios: error.message || null,
    },
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
