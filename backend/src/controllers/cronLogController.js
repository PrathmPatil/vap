import { fetchLogs } from "../services/cronLogService.js";

export const getLogsController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      job_name,
      status,
      date,
      start_date,
      end_date,
      search,
    } = req.query;

    const result = await fetchLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      job_name,
      status,
      date,
      start_date,
      end_date,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      data: result.data,
      pagination: result.pagination,
      uniqueJobNames: result.uniqueJobNames,
      statusCounts: result.statusCounts, // 🔥 IMPORTANT
    });
  } catch (error) {
    console.error("Get Logs Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};