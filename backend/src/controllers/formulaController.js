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
  processFormulaByDate
} from "../services/formulaService.js";
import { StrongBullishCandleModel } from "../models/index.js";


/* =========================================================
   RUN COMPLETE FORMULA ENGINE
========================================================= */

export const runFormulaEngine = async (req, res) => {
  try {

    const result = await runFormulaEngineService();

    return res.status(200).json({
      success: true,
      processed_symbols: result.processed_symbols,
      duration_ms: result.duration_ms,
      message: "Formula engine executed successfully"
    });

  } catch (error) {

    console.error("❌ Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Formula engine failed",
      error: error.message
    });

  }
};



/* =========================================================
   GENERATE STRONG BULLISH CANDLES
========================================================= */

export const generateStrongBullish = async (req, res) => {

  try {

    const {
      currentPage = 1,
      itemsPerPage = 10,
      searchTerm = "",
      base_percent,
      basePercent,
      date
    } = req.body;

    const selectedBasePercent =
      basePercent ?? base_percent ?? 2;

    const result = await processFormulaByDate({
      targetDate: date,

      formulaModel: StrongBullishCandleModel,

      formulaDateField: "trade_date",

      existingWhere: {
        base_percent: selectedBasePercent
      },

      generatePayload: {
        currentPage,
        itemsPerPage,
        searchTerm,
        base_percent: selectedBasePercent
      },

      generateFunction: generateStrongBullishService
    });

    return res.status(200).json(result);

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



/* =========================================================
   RALLY ATTEMPT CONTROLLER (FOR TESTING)
========================================================= */

export const runRallyAttempt = async (req, res) => {

  try {

    const { currentPage=1, itemsPerPage=10, searchTerm="", targetDate = null } = req.body;

    const result = await getRallyAttemptRecordsService({ currentPage, itemsPerPage, searchTerm, targetDate });

    return res.status(200).json({
      success: result.success,
      data: result.data,
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

    const { currentPage=1, itemsPerPage=10, searchTerm="", targetDate = null } = req.body;

    const result = await getFollowThroughDayRecordsService({ currentPage, itemsPerPage, searchTerm, targetDate });

    return res.status(200).json({
      success: result.success,
      data: result.data,
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

    const {currentPage=1, itemsPerPage=10, searchTerm="", targetDate = null} = req.body;

    const result = await getBuyDayRecordsService({ currentPage, itemsPerPage, searchTerm, targetDate });

    return res.status(200).json({
      success: result.success,
      data: result.data,
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
    const { currentPage=1, itemsPerPage=10, searchTerm="", base_percent=2, targetDate = null } = req.body;
    const result = await getVolumeBreakoutRecordsService({ currentPage, itemsPerPage, searchTerm, targetDate });

    return res.status(200).json({
      success: result.success,
      data: result.data,
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
    const { currentPage = 1, itemsPerPage = 10, searchTerm = '', targetDate = null } = req.body;

    const result = await getTweezerBottomRecordsService({
      currentPage,
      itemsPerPage,
      searchTerm,
      targetDate
    });

    return res.status(200).json({
      status: 'success',
      success: result.success,
      data: result.data,
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