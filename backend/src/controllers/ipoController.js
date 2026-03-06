// controllers/ipoController.js

import { getPaginatedIpoData } from '../services/ipoService.js';
import { dbModels } from "../models/index.js";


export const fetchIpoData = async (req, res) => {
  try {
    const { reportType } = req.params;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'reportType is required in URL'
      });
    }

    // Fetch paginated IPO data based on dynamic table name
    const result = await getPaginatedIpoData(reportType, req.query);

    return res.status(200).json({
      success: true,
      reportType,
      ...result
    });
  } catch (error) {
    console.error('❌ Error in fetchIpoData:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

export const fetchReportsCount = async (req, res) => {
  try {
    const { reportTypes } = req.body;

    if (!Array.isArray(reportTypes)) {
      return res.status(400).json({
        success: false,
        message: "reportTypes must be an array"
      });
    }

    const counts = {};
    let total = 0;

    for (const type of reportTypes) {

      // check model exists
      const model = dbModels[type];

      if (!model) {
        console.warn(`⚠️ Invalid table name: ${type}`);
        continue;
      }

      const count = await model.count();

      counts[type] = count;
      total += count;
    }

    return res.status(200).json({
      success: true,
      counts,
      total
    });

  } catch (error) {
    console.error("❌ Error in fetchReportsCount:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
