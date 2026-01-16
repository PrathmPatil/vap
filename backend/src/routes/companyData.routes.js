import express from 'express';
import {
  AllCompaniesData,
  CompaniesData,
  FailedSymbols,
  ListedCompanies
} from '../models/index.js';
import {Op, fn, col, where } from 'sequelize';
import { getAnalyzeCompaniesData } from '../controllers/companiesController.js';

const router = express.Router();
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// Pagination + Search utility
const getPaginatedData = async (model, req, res) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
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
 export const getPaginatedDataBySymbol = async (model, req, res) => {
  try {
    const { page = 1, limit = 100, search = "" } = req.query;
    const { symbol: paramSymbol } = req.params || {};

    if (!paramSymbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required in URL."
      });
    }

    const offset = (page - 1) * limit;

    let whereClause = {
      [Op.and]: [
        where(fn("LOWER", fn("TRIM", col("symbol"))), {
          [Op.like]: paramSymbol.trim().toLowerCase()
        })
      ]
    };

    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          where(fn("LOWER", fn("TRIM", col("symbol"))), {
            [Op.like]: `%${search.trim().toLowerCase()}%`
          })
        ]
      };
    }

    const { rows, count } = await model.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),

      offset: parseInt(offset),
       order: [["", "DESC"]]

 
    });

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No data found"
      });
    }

    res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: rows
    });

  } catch (err) {
    console.error("Pagination Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Routes
router.get('/all-companies', (req, res) =>
  getPaginatedData(AllCompaniesData, req, res)
);
router.get('/companies-data', (req, res) =>
  getPaginatedData(CompaniesData, req, res)
);
router.get('/failed-symbols', (req, res) =>
  getPaginatedData(FailedSymbols, req, res)
);
router.get('/listed-companies', (req, res) =>
  getPaginatedData(ListedCompanies, req, res)
); 
// get data based on company name(symbol) 
router.get('/:symbol', (req, res) => {
  getPaginatedDataBySymbol(AllCompaniesData, req, res);
});

router.get("/formula/all-companies", getAnalyzeCompaniesData);


export default router;
