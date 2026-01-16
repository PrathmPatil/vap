// controllers/ipoController.js

import { getPaginatedIpoData } from "../services/ipoService.js";



export const fetchIpoData = async (req, res) => {
  try {
    const { reportType } = req.params;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: "reportType is required in URL",
      });
    }

    // Fetch paginated IPO data based on dynamic table name
    const result = await getPaginatedIpoData(reportType, req.query);

    return res.status(200).json({
      success: true,
      reportType,
      ...result,
    });
  } catch (error) {
    console.error("❌ Error in fetchIpoData:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
