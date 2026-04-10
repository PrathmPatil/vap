import { fetchLogs } from "../services/cronLogService.js";

export const getLogsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, job_name, status } = req.query;

    const result = await fetchLogs({
      page,
      limit,
      job_name,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      ...result,
    });
  } catch (error) {
    console.error("Get Logs Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};