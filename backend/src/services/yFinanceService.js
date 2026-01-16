// get data from companies table and return as json based on symbol name
import { Op, fn, col, where, Sequelize } from "sequelize";
import { YCompanies } from "../models/index.js";
export const getYFinanceDataService = async (tableName, search, orderBy) => {
  let model;
  switch (tableName) {
    case "companies":
      model = YCompanies;
      break;
    default:
      throw new Error(`Table ${tableName} not found`);
  }

  const { rows, count } = await model.findAndCountAll({
    where: search+".NS"
      ? {
          [Op.or]: [
            { symbol: { [Op.like]: `%${search+".NS"}%` } },
            // { company_name: { [Op.like]: `%${search}%` } }
          ]
        }
      : {},
    order: [[orderBy, "DESC"]]
  });

  return {
    total: count,
    page: 1,
    pages: 1,
    data: rows
  };
};      


export const getYFinancePaginatedData = async (model, query) => {
  const {
    page = 1,
    limit = 1000,
    search = '',
    sortField = 'id',     // default sort column
    sortOrder = 'DESC'    // default sort order
  } = query;

  console.log("Query Params:", query);

  const offset = (page - 1) * limit;

  // Build search filter
  const whereClause = search+".NS"
    ? {
        [Op.or]: [
        { symbol: { [Op.like]: `%${search+".NS"}%` } },
          { name: { [Op.like]: `%${search}%` } }
        ]
      }
    : {};

  // Validate sortField against allowed columns to prevent SQL injection
  const allowedFields = [
    'id', 'symbol', 'name', 'sector', 'industry', 'marketCap',
    'currentPrice', 'previousClose', 'change', 'changePercent',
    'volume', 'high52Week', 'low52Week', 'beta', 'dividendYield',
    'forwardPE', 'trailingPE', 'addedAt'
  ];
  const orderColumn = allowedFields.includes(sortField) ? sortField : 'id';
  const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await model.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[orderColumn, orderDirection]]
  });

  return {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};

// Get unique sectors from YCompanies table

export const getUniqueSectorsService = async (tableName) => {
  let model;

  switch (tableName) {
    case "companies":
      model = YCompanies;
      break;
    default:
      throw new Error(`Table ${tableName} not found`);
  }

  const sectors = await model.findAll({
    attributes: [
      [Sequelize.fn("DISTINCT", Sequelize.col("sector")), "sector"]
    ],
    where: {
      sector: { [Op.ne]: null },
    },
    raw: true,
  });

  return {
    total: sectors.length,
    data: sectors.map((s) => (s.sector ? s.sector.trim() : null)).filter(Boolean),
  };
};
