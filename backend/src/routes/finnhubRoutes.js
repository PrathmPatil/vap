//
import express from 'express';
import { AllCompaniesData, ListedCompanies } from '../models/index.js';
import { Op, fn, literal, col, where } from 'sequelize';
import listed_companies from '../models/listed_companies.js';
import {
  EarningsCalendar,
  IPOCalendar,
  MarketHoliday,
  MarketStatus
} from '../models/finnhub.js';

const router = express.Router();

// | earnings_calendar              |
// | ipo_calendar                   |
// | market_holiday                 |
// | market_status

// MarketStatus, MarketHoliday, IPOCalendar, EarningsCalendar

router.get('/earnings_calendar', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await EarningsCalendar.findAll({
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Earnings calendar fetched successfully',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await EarningsCalendar.count(),
        pages: Math.ceil((await EarningsCalendar.count()) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

router.get('/ipo_calendar', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await IPOCalendar.findAll({
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'IPO calendar fetched successfully',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await IPOCalendar.count(),
        pages: Math.ceil((await IPOCalendar.count()) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching IPO calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

router.get('/market_holiday', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await MarketHoliday.findAll({
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Market holidays fetched successfully',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await MarketHoliday.count(),
        pages: Math.ceil((await MarketHoliday.count()) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching market holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

router.get('/market_status', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await MarketStatus.findAll({
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Market status fetched successfully',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await MarketStatus.count(),
        pages: Math.ceil((await MarketStatus.count()) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching market holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

export default router;
