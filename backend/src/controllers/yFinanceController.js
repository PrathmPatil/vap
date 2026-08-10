import { PR, YCompanies } from "../models/index.js";
import { getUniqueSectorsService, getYFinanceDataService, getYFinancePaginatedData } from "../services/yFinanceService.js";
import { getTechnicalScreenerPage } from "../services/technicalScreenerService.js";

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

// Prefer YFinance snapshot when available; otherwise fall back to PR + technicals.
export const getAllYFinanceData = async (req, res) => {
  try {
    try {
      const yfCount = await YCompanies.count();
      if (yfCount > 0) {
        const result = await getYFinancePaginatedData(YCompanies, req.query);
        return res.status(200).json({ success: true, source: "yfinance", ...result });
      }
    } catch {
      // fall through to PR screener
    }

    const result = await getTechnicalScreenerPage({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      sortField: req.query.sortField,
      sortOrder: req.query.sortOrder,
      filters: {
        rsiMin: req.query.rsiMin,
        rsiMax: req.query.rsiMax,
        obvMin: req.query.obvMin,
        priceMin: req.query.priceMin,
        priceMax: req.query.priceMax,
        volumeMin: req.query.volumeMin,
        bbPosition: req.query.bbPosition,
        maTrend: req.query.maTrend,
        onlyPositiveChange: req.query.onlyPositiveChange,
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in controller:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getUniqueSectors = async (req, res) => {
  try {
    try {
      const yfCount = await YCompanies.count();
      if (yfCount > 0) {
        const sectors = await getUniqueSectorsService("companies");
        return res.status(200).json({
          success: true,
          sectors: sectors.data || sectors,
        });
      }
    } catch {
      // fall through
    }
    res.status(200).json({ success: true, sectors: ["EQ", "BE", "BZ"] });
  } catch (err) {
    console.error("❌ Error in controller:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

void PR;
