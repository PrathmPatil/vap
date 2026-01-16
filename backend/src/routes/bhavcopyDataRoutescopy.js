import express from 'express';
import {
  BC, BH, Corpbond, ETF, FFIX, GL, HL, IX, MCAP, PD, PR
} from '../models/index.js'; // adjust path as needed
import { Op } from 'sequelize';

const router = express.Router();

// Helper to catch async errors
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Generic paginated fetch with optional search on common fields
 * @param {Model} model - Sequelize model to query
 * @param {Request} req
 * @param {Response} res
 */
const getPaginatedData = async (model, req, res) => {
  try {
    let { page = 1, limit = 100, search = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Adjust these fields per your model schema for searching:
    const searchableFields = ['SYMBOL', 'SECURITY', 'SERIES', 'source_date'];

    const whereClause = search
      ? {
          [Op.or]: searchableFields.map(field => ({
            [field]: { [Op.like]: `%${search}%` }
          }))
        }
      : {};

    const { rows, count } = await model.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['source_date', 'DESC']], // you can adjust ordering
    });

    res.status(200).json({
      success: true,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/', (req, res) => {
  res.send('📂 Welcome to the Corporate Events Ingestion API.');
});

router.get('/bc', asyncHandler((req, res) => getPaginatedData(BC, req, res)));
router.get('/bh', asyncHandler((req, res) => getPaginatedData(BH, req, res)));
router.get('/corpbond', asyncHandler((req, res) => getPaginatedData(Corpbond, req, res)));
router.get('/etf', asyncHandler((req, res) => getPaginatedData(ETF, req, res)));
router.get('/ffix', asyncHandler((req, res) => getPaginatedData(FFIX, req, res)));
router.get('/gl', asyncHandler((req, res) => getPaginatedData(GL, req, res)));
router.get('/hl', asyncHandler((req, res) => getPaginatedData(HL, req, res)));
router.get('/ix', asyncHandler((req, res) => getPaginatedData(IX, req, res)));
router.get('/mcap', asyncHandler((req, res) => getPaginatedData(MCAP, req, res)));
router.get('/pd', asyncHandler((req, res) => getPaginatedData(PD, req, res)));
router.get('/pr', asyncHandler((req, res) => getPaginatedData(PR, req, res)));

export default router;
