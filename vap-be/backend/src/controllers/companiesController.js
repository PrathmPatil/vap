// controllers/companiesController.js

import { analyzeCompanies } from "../services/companiesService";

// 🔍 Controller to handle GET /formula/all-companies?date=YYYY-MM-DD
export const getAnalyzeCompaniesData = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required in query. Example: /formula/all-companies?date=2024-11-15"
      });
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
