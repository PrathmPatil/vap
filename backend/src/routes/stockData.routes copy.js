import express from 'express';
import { AllCompaniesData, CompaniesData, FailedSymbols, ListedCompanies } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * Utility function for pagination & search
 */
const getPaginatedData = async (model, req, res) => {
  try {
    const { page = 1, limit = 1000, search = '' } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [Op.or]: [
            { symbol: { [Op.like]: `%${search}%` } },
            { company_name: { [Op.like]: `%${search}%` } }
          ]
        }
      : {};

    const { rows, count } = await model.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET: All Companies Data
router.get('/all-companies', (req, res) => getPaginatedData(AllCompaniesData, req, res));

// GET: Companies Data
router.get('/companies-data', (req, res) => getPaginatedData(CompaniesData, req, res));

// GET: Failed Symbols
router.get('/failed-symbols', (req, res) => getPaginatedData(FailedSymbols, req, res));

// GET: Listed Companies
router.get('/listed-companies', (req, res) => getPaginatedData(ListedCompanies, req, res));

export default router;
