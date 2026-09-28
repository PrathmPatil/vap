import { Op, where, fn, col, literal } from 'sequelize';
import { ListedCompanies, PR, sequelizeBhavcopy } from '../models/index.js';

const stripExchangeSuffix = (value) =>
  String(value || '')
    .trim()
    .replace(/\.(NS|BO)$/i, '');

const normalizeCompanyName = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(LIMITED|LTD|PVT|PRIVATE|THE|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parsePrice = (value) => {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const normalizeTradeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return null;
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, '0');
  const d = String(dateValue.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const pickOrderBy = (model, orderBy) => {
  const attributes = Object.keys(model.rawAttributes || {});
  if (orderBy && attributes.includes(orderBy)) return orderBy;
  if (attributes.includes('source_date')) return 'source_date';
  if (attributes.includes('created_at')) return 'created_at';
  if (attributes.includes('id')) return 'id';
  return attributes[0];
};

const prUsableStatusWhere = () =>
  literal(
    `(status IS NULL OR TRIM(status) = '' OR UPPER(TRIM(status)) = 'OK' OR UPPER(TRIM(status)) <> 'MISSING')`
  );

async function resolvePrSecurity(symbol) {
  const clean = stripExchangeSuffix(symbol).toUpperCase();
  const listed = await ListedCompanies.findOne({
    where: where(
      fn('UPPER', fn('REPLACE', col('symbol'), '.NS', '')),
      clean
    ),
    raw: true,
  });

  const target = normalizeCompanyName(listed?.name || clean);
  const prefix = `${target.split(' ')[0]}%`;
  const [candidates] = await sequelizeBhavcopy.query(
    `SELECT DISTINCT SECURITY FROM pr WHERE UPPER(TRIM(SECURITY)) LIKE :prefix LIMIT 80`,
    { replacements: { prefix } }
  );

  const scored = (candidates || [])
    .map((row) => {
      const name = normalizeCompanyName(row.SECURITY);
      let score = 0;
      if (name === target) score = 100;
      else if (name.startsWith(target) || target.startsWith(name)) score = 80;
      else if (name.includes(target) || target.includes(name)) score = 40;
      return { security: row.SECURITY, score, name };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length);

  return {
    security: scored[0]?.security || listed?.name || clean,
    listed,
    symbol: stripExchangeSuffix(listed?.symbol || clean).toUpperCase(),
  };
}

export const getPaginatedData = async (model, query, orderBy) => {
  const { page = 1, limit = 1000, search = '' } = query;

  const offset = (page - 1) * limit;
  const attributes = Object.keys(model.rawAttributes);

  let whereClause = {};

  if (search) {
    const searchConditions = [];

    if (attributes.includes('symbol')) {
      searchConditions.push({
        symbol: { [Op.like]: `%${search}%` }
      });
    }

    if (attributes.includes('company_name')) {
      searchConditions.push({
        company_name: { [Op.like]: `%${search}%` }
      });
    }

    if (searchConditions.length > 0) {
      whereClause = { [Op.or]: searchConditions };
    }
  }

  const { rows, count } = await model.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[pickOrderBy(model, orderBy), 'DESC']]
  });

  return {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};

export const getPaginatedDataBySymbol = async (model, req, orderBy) => {
  const { page = 1, limit = 100, search = '' } = req.query;
  const { symbol: paramSymbol } = req.params || {};

  if (!paramSymbol) {
    throw new Error('Symbol is required in URL.');
  }

  const offset = (page - 1) * limit;
  const attributes = Object.keys(model.rawAttributes || {});

  if (!attributes.includes('symbol') || !attributes.includes(orderBy) && !attributes.includes('date')) {
    return getCompanyPriceHistoryBySymbol(req);
  }

  let whereClause = {
    [Op.and]: [
      where(fn('LOWER', fn('TRIM', col('symbol'))), {
        [Op.eq]: paramSymbol.trim().toLowerCase()
      })
    ]
  };

  if (search) {
    whereClause[Op.or] = [
      where(fn('LOWER', fn('TRIM', col('symbol'))), {
        [Op.like]: `%${search.trim().toLowerCase()}%`
      })
    ];
  }

  const { rows, count } = await model.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[pickOrderBy(model, orderBy), 'DESC']]
  });

  if (!rows.length) {
    return getCompanyPriceHistoryBySymbol(req);
  }

  return {
    success: true,
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};

export const getCompanyPriceHistoryBySymbol = async (req) => {
  const { page = 1, limit = 100 } = req.query;
  const { symbol: paramSymbol } = req.params || {};

  if (!paramSymbol) {
    throw new Error('Symbol is required in URL.');
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
  const offset = (pageNum - 1) * limitNum;
  const resolved = await resolvePrSecurity(paramSymbol);

  const { rows, count } = await PR.findAndCountAll({
    where: {
      SECURITY: resolved.security,
      [Op.and]: [prUsableStatusWhere()],
    },
    limit: limitNum,
    offset,
    order: [[col('source_date'), 'DESC']],
    raw: true,
  });

  const data = rows.map((row, index) => ({
    id: row.id ?? offset + index + 1,
    symbol: resolved.symbol,
    security: row.SECURITY,
    date: normalizeTradeDate(row.source_date),
    open: parsePrice(row.OPEN_PRICE),
    high: parsePrice(row.HIGH_PRICE),
    low: parsePrice(row.LOW_PRICE),
    close: parsePrice(row.CLOSE_PRICE),
    volume: parsePrice(row.NET_TRDQTY),
    dividends: 0,
    stock_splits: 0,
  }));

  if (!data.length) {
    return {
      success: true,
      message: `No PR price history found for ${resolved.symbol}`,
      data: [],
      security: resolved.security,
    };
  }

  return {
    success: true,
    total: count,
    page: pageNum,
    pages: Math.ceil(count / limitNum),
    security: resolved.security,
    data,
  };
};
