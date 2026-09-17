import {
  fetchHolidays,
  getCoverageCalendar,
  getCoverageDateDetail,
} from "../services/marketHolidayService.js";

export const getCoverageCalendarController = async (req, res) => {
  try {
    const year = Number(req.query.year || req.body?.year);
    const month = Number(req.query.month || req.body?.month);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Valid year and month (1–12) are required",
      });
    }

    const result = await getCoverageCalendar({ year, month });

    return res.status(200).json({
      success: true,
      message: "Bhavcopy coverage calendar loaded",
      ...result,
    });
  } catch (error) {
    console.error("Coverage calendar error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load coverage calendar",
    });
  }
};

export const getCoverageDateDetailController = async (req, res) => {
  try {
    const date = req.query.date || req.params.date;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required (YYYY-MM-DD)",
      });
    }

    const result = await getCoverageDateDetail({ date });

    return res.status(200).json({
      success: true,
      message: "Date coverage detail loaded",
      ...result,
    });
  } catch (error) {
    console.error("Coverage date detail error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load date detail",
    });
  }
};

export const getHolidaysController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.body;

    const result = await fetchHolidays({
      page,
      limit,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Market holidays fetched successfully",
      ...result,
    });
  } catch (error) {
    console.error("Get Holidays Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};