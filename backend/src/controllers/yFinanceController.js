import { YCompanies } from "../models/index.js";
import { getUniqueSectorsService, getYFinanceDataService, getYFinancePaginatedData } from "../services/yFinanceService.js";

export const getYFinanceData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await getYFinanceDataService("companies", symbol, "marketCap");
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in controller:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// getAllYFinanceData
export const getAllYFinanceData = async (req, res) => {
  try {
    const result = await getYFinancePaginatedData(YCompanies, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("❌ Error in controller:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// getUniqueSectorsService
export const getUniqueSectors = async (req, res) => {
  try {
    const sectors = await getUniqueSectorsService("companies");
    res.status(200).json({ success: true, sectors });
  } catch (err) {
    console.error("❌ Error in controller:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
