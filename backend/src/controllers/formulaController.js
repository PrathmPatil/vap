import { Op } from "sequelize";
import {
  runFormulaEngineService,
  generateStrongBullishService,
  generateFollowThroughDayService,
  generateBuyDayService,
  generateRallyAttemptService,
  generateVolumeBreakoutService,
  detectTweezerBottomPatterns,
  getRallyAttemptRecordsService,
  getFollowThroughDayRecordsService,
  getBuyDayRecordsService,
  getStrongBullishRecordsService,
  getVolumeBreakoutRecordsService,
  getTweezerBottomRecordsService,
  getBearishCandleRecordsService,
  getGapUpDayRecordsService,
  getGapDownDayRecordsService,
  getFiftyTwoWeekHighRecordsService,
  getTopGainerDayRecordsService,
  getBandHit52wRecordsService,
  getTopLoserDayRecordsService,
  getFiftyTwoWeekLowRecordsService,
  getDailyMoverUpRecordsService,
  getDailyMoverDownRecordsService,
  getFormulaAvailableDatesService,
  getFormulaCompaniesService,
  getFormulaMetaService,
  queryFormulaService,
  processFormulaByDate
} from "../services/formulaService.js";
import {
  StrongBullishCandleModel,
  BearishCandleModel,
  GapUpDayModel,
  GapDownDayModel,
  FiftyTwoWeekHighModel,
  TopGainerDayModel,
  BandHit52wModel,
  TopLoserDayModel,
  FiftyTwoWeekLowModel,
  DailyMoverUpModel,
  DailyMoverDownModel
} from "../models/index.js";
import {
  generateBearishCandleService,
  generateGapUpService,
  generateGapDownService,
  generateFiftyTwoWeekHighService,
  generateTopGainerService,
  generateBandHit52wService,
  generateTopLoserService,
  generateFiftyTwoWeekLowService,
  generateDailyMoverUpService,
  generateDailyMoverDownService
} from "../services/formulaExtendedService.js";

const clampPageSize = (value, { max = 50 } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 10;
  return Math.min(Math.max(Math.trunc(num), 1), max);
};

const parseFormulaFilters = (body = {}, { forExport = false } = {}) => {
  const {
    currentPage = 1,
    itemsPerPage = 10,
    searchTerm = "",
    symbol = "",
    date,
    targetDate,
    base_percent,
    basePercent,
    changePercentMin,
    change_percent_min,
    changePercentMax,
    change_percent_max,
    changeSort,
    change_sort,
  } = body;

  return {
    currentPage: Number(currentPage) || 1,
    itemsPerPage: clampPageSize(itemsPerPage, { max: forExport ? 10000 : 50 }),
    searchTerm: String(searchTerm || "").trim(),
    symbol: String(symbol || "").trim(),
    targetDate: date || targetDate || null,
    basePercent: basePercent ?? base_percent ?? 2,
    changePercentMin: changePercentMin ?? change_percent_min ?? null,
    changePercentMax: changePercentMax ?? change_percent_max ?? null,
    changeSort: changeSort || change_sort || "desc",
  };
};

export const getFormulaAvailableDates = async (req, res) => {
  try {
    const { formulaType } = req.params;
    const { basePercent, base_percent } = req.query;

    const result = await getFormulaAvailableDatesService(formulaType, {
      basePercent: basePercent ?? base_percent ?? 2
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getFormulaMeta = async (req, res) => {
  try {
    const {
      formulaType,
      formula_type,
      resource = "dates",
      date,
      targetDate,
      searchTerm = "",
      basePercent,
      base_percent,
      limit = 300
    } = req.query;

    const type = formulaType || formula_type;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "formulaType is required"
      });
    }

    const result = await getFormulaMetaService(type, {
      resource,
      targetDate: date || targetDate || null,
      searchTerm,
      basePercent: basePercent ?? base_percent ?? 2,
      limit: Number(limit) || 300
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const queryFormula = async (req, res) => {
  try {
    const { formulaType, formula_type, ...rest } = req.body || {};
    const type = formulaType || formula_type;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "formulaType is required"
      });
    }

    const filters = parseFormulaFilters(rest);
    const result = await queryFormulaService(type, filters);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const exportFormulaXlsx = async (req, res) => {
  try {
    const { formulaType, formula_type, ...rest } = req.body || {};
    const type = formulaType || formula_type;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "formulaType is required",
      });
    }

    const filters = parseFormulaFilters(
      { ...rest, currentPage: 1, itemsPerPage: 10000 },
      { forExport: true }
    );
    const result = await queryFormulaService(type, filters);

    if (!result?.success) {
      return res.status(400).json(result);
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");
    const rows = Array.isArray(result.data) ? result.data : [];
    const hidden = new Set([
      "id",
      "created_at",
      "updated_at",
      "createdAt",
      "updatedAt",
    ]);
    const keys = rows.length
      ? Object.keys(rows[0]).filter((key) => !hidden.has(key) && key.toLowerCase() !== "id")
      : ["security", "symbol", "open_price", "close_price", "change_percent"];

    sheet.columns = keys.map((key) => ({
      header: key.replace(/_/g, " ").toUpperCase(),
      key,
      width: Math.max(14, key.length + 6),
    }));

    rows.forEach((row) => {
      const values = {};
      keys.forEach((key) => {
        const value = row[key];
        values[key] =
          key.toLowerCase() === "symbol" && typeof value === "string"
            ? value.replace(/\.(NS|BSE|BO)$/i, "")
            : value;
      });
      sheet.addRow(values);
    });

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    keys.forEach((key, index) => {
      const col = sheet.getColumn(index + 1);
      if (key.includes("percent")) col.numFmt = "0.00";
      if (key.includes("price")) col.numFmt = "#,##0.00";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const datePart = String(result.trade_date || result.latest_date || "latest").slice(0, 10);
    const filename = `${type}_${datePart}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFormulaCompanies = async (req, res) => {
  try {
    const { formulaType } = req.params;
    const {
      date,
      targetDate,
      searchTerm = "",
      basePercent,
      base_percent,
      limit = 300
    } = req.query;

    const result = await getFormulaCompaniesService(formulaType, {
      targetDate: date || targetDate || null,
      searchTerm,
      basePercent: basePercent ?? base_percent ?? 2,
      limit: Number(limit) || 300
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


/* =========================================================
   RUN COMPLETE FORMULA ENGINE
========================================================= */

export const runFormulaEngine = async (req, res) => {
  try {
    const {
      trigger_source: triggerSource = null,
      trade_date: tradeDate = null,
      targetDate = null
    } = req.body || {};

    const result = await runFormulaEngineService({
      targetDate: tradeDate || targetDate,
      triggerSource
    });

    return res.status(200).json({
      success: true,
      trade_date: result.trade_date,
      trigger_source: result.trigger_source,
      processed_symbols: result.processed_symbols,
      duration_ms: result.duration_ms,
      formulas: result.formulas,
      message: 'Formula engine executed successfully'
    });
  } catch (error) {
    console.error('❌ Controller Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Formula engine failed',
      error: error.message
    });
  }
};



/* =========================================================
   GENERATE STRONG BULLISH CANDLES
========================================================= */

const respondWithFormulaRows = async (res, ensureResult, filters, getRecordsFn) => {
  if (!ensureResult.success) {
    return res.status(200).json(ensureResult);
  }

  const result = await getRecordsFn({
    currentPage: filters.currentPage,
    itemsPerPage: filters.itemsPerPage,
    searchTerm: filters.searchTerm,
    symbol: filters.symbol,
    targetDate: ensureResult.trade_date || filters.targetDate,
    basePercent: filters.basePercent
  });

  return res.status(200).json({
    ...result,
    source: ensureResult.source,
    calculated: ensureResult.calculated,
    requested_date: ensureResult.requested_date || filters.targetDate
  });
};

const runEnsuredFormula = async (
  res,
  {
    filters,
    formulaModel,
    formulaDateField,
    existingWhere,
    generatePayload,
    generateFunction,
    getRecordsFn
  }
) => {
  try {
    const ensureResult = await processFormulaByDate({
      targetDate: filters.targetDate,
      formulaModel,
      formulaDateField,
      existingWhere,
      generatePayload: {
        ...generatePayload,
        currentPage: filters.currentPage,
        itemsPerPage: filters.itemsPerPage,
        searchTerm: filters.searchTerm
      },
      generateFunction
    });

    return respondWithFormulaRows(res, ensureResult, filters, getRecordsFn);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const generateStrongBullish = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const selectedBasePercent = filters.basePercent;

  return runEnsuredFormula(res, {
    filters,
    formulaModel: StrongBullishCandleModel,
    formulaDateField: "trade_date",
    existingWhere: { base_percent: selectedBasePercent },
    generatePayload: { base_percent: selectedBasePercent },
    generateFunction: generateStrongBullishService,
    getRecordsFn: getStrongBullishRecordsService
  });
};

export const generateBearishCandle = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const selectedBasePercent = filters.basePercent;

  return runEnsuredFormula(res, {
    filters,
    formulaModel: BearishCandleModel,
    formulaDateField: "trade_date",
    existingWhere: { base_percent: selectedBasePercent },
    generatePayload: { base_percent: selectedBasePercent },
    generateFunction: generateBearishCandleService,
    getRecordsFn: getBearishCandleRecordsService
  });
};

export const generateGapUpDay = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const gapThreshold = filters.basePercent || 1;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: gapThreshold },
    formulaModel: GapUpDayModel,
    formulaDateField: "trade_date",
    existingWhere: { gap_threshold: gapThreshold },
    generatePayload: { gap_threshold: gapThreshold },
    generateFunction: generateGapUpService,
    getRecordsFn: getGapUpDayRecordsService
  });
};

export const generateGapDownDay = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const gapThreshold = filters.basePercent || 1;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: gapThreshold },
    formulaModel: GapDownDayModel,
    formulaDateField: "trade_date",
    existingWhere: { gap_threshold: gapThreshold },
    generatePayload: { gap_threshold: gapThreshold },
    generateFunction: generateGapDownService,
    getRecordsFn: getGapDownDayRecordsService
  });
};

export const generateFiftyTwoWeekHigh = async (req, res) => {
  const filters = parseFormulaFilters(req.body);

  return runEnsuredFormula(res, {
    filters,
    formulaModel: FiftyTwoWeekHighModel,
    formulaDateField: "trade_date",
    existingWhere: {},
    generatePayload: {},
    generateFunction: generateFiftyTwoWeekHighService,
    getRecordsFn: getFiftyTwoWeekHighRecordsService
  });
};

export const generateTopGainerDay = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const minPercent = filters.basePercent || 3;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: minPercent },
    formulaModel: TopGainerDayModel,
    formulaDateField: "trade_date",
    existingWhere: { min_percent: minPercent },
    generatePayload: { min_percent: minPercent },
    generateFunction: generateTopGainerService,
    getRecordsFn: getTopGainerDayRecordsService
  });
};

export const generateBandHit52w = async (req, res) => {
  const filters = parseFormulaFilters(req.body);

  return runEnsuredFormula(res, {
    filters,
    formulaModel: BandHit52wModel,
    formulaDateField: "trade_date",
    existingWhere: {},
    generatePayload: {},
    generateFunction: generateBandHit52wService,
    getRecordsFn: getBandHit52wRecordsService
  });
};

export const generateTopLoserDay = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const minPercent = filters.basePercent || 3;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: minPercent },
    formulaModel: TopLoserDayModel,
    formulaDateField: "trade_date",
    existingWhere: { min_percent: minPercent },
    generatePayload: { min_percent: minPercent },
    generateFunction: generateTopLoserService,
    getRecordsFn: getTopLoserDayRecordsService
  });
};

export const generateFiftyTwoWeekLow = async (req, res) => {
  const filters = parseFormulaFilters(req.body);

  return runEnsuredFormula(res, {
    filters,
    formulaModel: FiftyTwoWeekLowModel,
    formulaDateField: "trade_date",
    existingWhere: {},
    generatePayload: {},
    generateFunction: generateFiftyTwoWeekLowService,
    getRecordsFn: getFiftyTwoWeekLowRecordsService
  });
};

export const generateDailyMoverUp = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const minPercent = filters.basePercent || 3;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: minPercent },
    formulaModel: DailyMoverUpModel,
    formulaDateField: "trade_date",
    existingWhere: { min_percent: minPercent },
    generatePayload: { min_percent: minPercent },
    generateFunction: generateDailyMoverUpService,
    getRecordsFn: getDailyMoverUpRecordsService
  });
};

export const generateDailyMoverDown = async (req, res) => {
  const filters = parseFormulaFilters(req.body);
  const minPercent = filters.basePercent || 3;

  return runEnsuredFormula(res, {
    filters: { ...filters, basePercent: minPercent },
    formulaModel: DailyMoverDownModel,
    formulaDateField: "trade_date",
    existingWhere: { min_percent: minPercent },
    generatePayload: { min_percent: minPercent },
    generateFunction: generateDailyMoverDownService,
    getRecordsFn: getDailyMoverDownRecordsService
  });
};



/* =========================================================
   RALLY ATTEMPT CONTROLLER (FOR TESTING)
========================================================= */

export const runRallyAttempt = async (req, res) => {

  try {

    const filters = parseFormulaFilters(req.body);

    const result = await getRallyAttemptRecordsService(filters);

    return res.status(200).json({
      success: result.success,
      data: result.data,
      trade_date: result.trade_date,
      latest_date: result.latest_date,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: "Rally attempt detection completed"
    });

  } catch (error) {

    console.error("❌ Rally Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Rally attempt detection failed",
      error: error.message
    });

  }
};



/* =========================================================
   FOLLOW THROUGH DAY CONTROLLER
========================================================= */

export const runFollowThroughDay = async (req, res) => {

  try {

    const filters = parseFormulaFilters(req.body);

    const result = await getFollowThroughDayRecordsService(filters);

    return res.status(200).json({
      success: result.success,
      data: result.data,
      trade_date: result.trade_date,
      latest_date: result.latest_date,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: "Follow Through Day detection completed"
    });

  } catch (error) {

    console.error("❌ FTD Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "FTD detection failed",
      error: error.message
    });

  }
};



/* =========================================================
   BUY DAY CONTROLLER
========================================================= */

export const runBuyDay = async (req, res) => {

  try {

    const filters = parseFormulaFilters(req.body);

    const result = await getBuyDayRecordsService(filters);

    return res.status(200).json({
      success: result.success,
      data: result.data,
      trade_date: result.trade_date,
      latest_date: result.latest_date,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: "Buy day detection completed"
    });

  } catch (error) {

    console.error("❌ Buy Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Buy day detection failed",
      error: error.message
    });

  }
};

export const getVolumeBreakouts = async (req,res) => {

  try {
    const filters = parseFormulaFilters(req.body);
    const result = await getVolumeBreakoutRecordsService(filters);

    return res.status(200).json({
      success: result.success,
      data: result.data,
      trade_date: result.trade_date,
      latest_date: result.latest_date,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: "Volume breakout detection completed"
    });

  } catch (error) {

    console.error("❌ Volume Breakout Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Volume breakout detection failed",
      error: error.message
    });

  }
};

export const getTweezerBottomPatterns = async (req, res) => {
  try {
    const filters = parseFormulaFilters(req.body);

    const result = await getTweezerBottomRecordsService(filters);

    return res.status(200).json({
      status: 'success',
      success: result.success,
      data: result.data,
      trade_date: result.trade_date,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      latest_date: result.latest_date
    });
    
  } catch (error) {
    console.error('Error in getTweezerBottomPatterns:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get signals from database (already saved)
export const getSavedTweezerBottomSignals = async (req, res) => {
  try {
    const { startDate, endDate, security, minStrength, limit, offset } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.trade_date = { [Op.between]: [startDate, endDate] };
    }
    if (security) where.security = security;
    if (minStrength) where.signal_strength = minStrength;
    
    const { TweezerBottomModel } = await import("../models/index.js");
    await TweezerBottomModel.sync(); // Ensure model is synced before querying

    const signals = await TweezerBottomModel.findAndCountAll({
      where,
      order: [['trade_date', 'DESC'], ['signal_strength', 'DESC']],
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });
    
    return res.status(200).json({
      status: 'success',
      data: signals
    });
    
  } catch (error) {
    console.error('Error in getSavedTweezerBottomSignals:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};