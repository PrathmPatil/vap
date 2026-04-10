import { fetchHolidays } from "../services/marketHolidayService.js";

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