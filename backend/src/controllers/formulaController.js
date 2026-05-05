import { TweezerBottomModel } from "../models/index.js";
import {
  runFormulaEngineService,
  generateStrongBullishService,
  generateFollowThroughDayService,
  generateBuyDayService,
  generateRallyAttemptService,
  generateVolumeBreakoutService,
  detectTweezerBottomPatterns
} from "../services/formulaService.js";


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
  const { currentPage=1, itemsPerPage=10, searchTerm="", base_percent=2 } = req.body;

    const result = await generateStrongBullishService({
      currentPage,
      itemsPerPage,
      searchTerm,
      base_percent
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      latest_date: result.latest_date,
      inserted_rows: result.inserted_rows,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: "Strong bullish generated successfully"
    });

  } catch (error) {

    console.error("❌ Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Strong bullish generation failed",
      error: error.message
    });

  }
};



/* =========================================================
   RALLY ATTEMPT CONTROLLER (FOR TESTING)
========================================================= */

export const runRallyAttempt = async (req, res) => {

  try {

    const { currentPage=1, itemsPerPage=10, searchTerm="",} = req.body;

    const result = await generateRallyAttemptService({ currentPage, itemsPerPage, searchTerm });

    return res.status(200).json({
            success: true,
      data: result.data,
      latest_date: result.latest_date,
      inserted_rows: result.inserted_rows,
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

    const { currentPage=1, itemsPerPage=10, searchTerm="",} = req.body;

    const result = await generateFollowThroughDayService({ currentPage, itemsPerPage, searchTerm });

    return res.status(200).json({
      success: true,
      data: result.data,
      latest_date: result.latest_date,
      inserted_rows: result.inserted_rows,
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

    const {currentPage=1, itemsPerPage=10, searchTerm="",} = req.body;

    const result = await generateBuyDayService(currentPage, itemsPerPage, searchTerm);

    return res.status(200).json({
      success: true,
      data: result.data,
      latest_date: result.latest_date,
      inserted_rows: result.inserted_rows,
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
    const { currentPage=1, itemsPerPage=10, searchTerm="", base_percent=2 } = req.body;
    const data = await generateVolumeBreakoutService({ currentPage, itemsPerPage, searchTerm, base_percent });

    return res.status(200).json({
      success: true,
      data: data,
      latest_date: data.latest_date,
      inserted_rows: data.inserted_rows,
      currentPage: data.currentPage,
      itemsPerPage: data.itemsPerPage,
      totalItems: data.totalItems,
      totalPages: data.totalPages,
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
    const { targetDate, forceRefresh, saveToDb } = req.query;
    
    const result = await detectTweezerBottomPatterns({
      targetDate: targetDate || null,      // YYYY-MM-DD format
      forceRefresh: forceRefresh === 'true', // Force refresh even if exists
      saveToDb: saveToDb !== 'false'        // Default true
    });
    
    if (result.success) {
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to detect patterns',
        error: result.error
      });
    }
    
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
        await TweezerBottomModel.sync(); // Ensure model is synced before querying
    if (!TweezerBottomModel) {
      return res.status(500).json({
        status: 'error',
        message: 'Model not initialized'
      });
    }
    
    const where = {};
    if (startDate && endDate) {
      where.trade_date = { [Op.between]: [startDate, endDate] };
    }
    if (security) where.security = security;
    
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