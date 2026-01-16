// controllers/companiesController.js

import { analyzeCompanies } from "../services/companiesService.js";

// GET /formula/all-companies?date=YYYY-MM-DD
export const getAnalyzeCompaniesData = async (req, res) => {
  try {
    let { date } = req.query;

    // ✅ If date not provided, use today's date
    if (!date) {
      date = new Date().toISOString().split("T")[0];
      console.log("⚠️ Date not provided. Using today's date:", date);
    }

    console.log("Controller received date:", date);

    const result = await analyzeCompanies(date);

    return res.status(200).json({
      success: true,
      analyzedDate: date,
      ...result
    });

  } catch (error) {
    console.error("❌ Error in getAnalyzeCompaniesData:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
