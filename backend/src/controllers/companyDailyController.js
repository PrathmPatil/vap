import {
  ListedCompanies,
  AllIndices,
  PR,
  sequelizeBhavcopy,
} from '../models/index.js';
import { Op, QueryTypes, fn, col, where, literal } from 'sequelize';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const STOCK_SERIES = ['EQ', 'BE', 'BZ'];

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const normalizeTradeDate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return null;
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, '0');
  const d = String(dateValue.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const prUsableStatusWhere = () =>
  literal(
    `(status IS NULL OR TRIM(status) = '' OR UPPER(TRIM(status)) = 'OK' OR UPPER(TRIM(status)) <> 'MISSING')`
  );

const prSourceDateWhere = (tradeDate) => ({
  [Op.and]: [
    where(fn('DATE', col('source_date')), tradeDate),
    prUsableStatusWhere(),
  ],
});

async function getLatestEtfDate() {
  const [row] = await sequelizeBhavcopy.query(
    `SELECT MAX(source_date) AS latest FROM etf WHERE source_date IS NOT NULL`,
    { type: QueryTypes.SELECT }
  );
  return normalizeTradeDate(row?.latest) || row?.latest || null;
}

/** Catalog mode: all listed equities (no date filter). */
async function fetchListedCatalog({ searchTerm, pageSize, offset }) {
  const result = await ListedCompanies.findAndCountAll({
    where: searchTerm
      ? {
          series: { [Op.in]: STOCK_SERIES },
          [Op.or]: [
            { symbol: { [Op.like]: `%${searchTerm}%` } },
            { name: { [Op.like]: `%${searchTerm}%` } },
          ],
        }
      : { series: { [Op.in]: STOCK_SERIES } },
    limit: pageSize,
    offset,
    order: [['date_of_listing', 'DESC']],
  });

  const data = result.rows.map((company) => ({
    id: company.id,
    symbol: company.symbol,
    name: company.name,
    series: company.series,
    date_of_listing: company.date_of_listing,
    paid_up_value: company.paid_up_value,
    market_lot: company.market_lot,
    isin: company.isin,
    face_value: company.face_value,
    instrument_type: 'stocks',
    source: 'listed_companies',
  }));

  return { total: result.count, data, as_of: null, price_as_of: null };
}

const mapListedRow = (company, prRow = null, tradeDate = null) => ({
  id: company.id,
  symbol: company.symbol,
  name: company.name,
  series: company.series,
  date_of_listing: company.date_of_listing,
  paid_up_value: company.paid_up_value,
  market_lot: company.market_lot,
  isin: company.isin,
  face_value: company.face_value,
  close_price: prRow?.CLOSE_PRICE != null ? String(prRow.CLOSE_PRICE).trim() : null,
  previous_close:
    prRow?.PREV_CL_PR != null ? String(prRow.PREV_CL_PR).trim() : null,
  open_price: prRow?.OPEN_PRICE != null ? String(prRow.OPEN_PRICE).trim() : null,
  high_price: prRow?.HIGH_PRICE != null ? String(prRow.HIGH_PRICE).trim() : null,
  low_price: prRow?.LOW_PRICE != null ? String(prRow.LOW_PRICE).trim() : null,
  volume: prRow?.NET_TRDQTY != null ? String(prRow.NET_TRDQTY).trim() : null,
  source_date: tradeDate,
  instrument_type: 'stocks',
  source: prRow ? 'listed_companies+pr' : 'listed_companies',
});

async function loadListedByName() {
  const companies = await ListedCompanies.findAll({
    where: { series: { [Op.in]: STOCK_SERIES } },
    raw: true,
  });
  const byName = new Map();
  for (const company of companies) {
    const key = normalizeName(company.name);
    if (key) byName.set(key, company);
  }
  return byName;
}

/**
 * Selected date = trade date (PR source_date).
 * Rows come from listed_companies (incl. date_of_listing) + that day's prices.
 */
async function fetchStocksByTradeDate({
  tradeDate,
  searchTerm,
  pageSize,
  offset,
}) {
  const byName = await loadListedByName();

  const prRows = await PR.findAll({
    where: prSourceDateWhere(tradeDate),
    order: [['SECURITY', 'ASC']],
    raw: true,
  });

  const q = String(searchTerm || '').toLowerCase();
  const matched = [];

  for (const row of prRows) {
    const company = byName.get(normalizeName(row.SECURITY));
    if (!company) continue;

    if (q) {
      const symbol = String(company.symbol || '').toLowerCase();
      const name = String(company.name || '').toLowerCase();
      const security = String(row.SECURITY || '').toLowerCase();
      if (!symbol.includes(q) && !name.includes(q) && !security.includes(q)) {
        continue;
      }
    }

    matched.push(mapListedRow(company, row, tradeDate));
  }

  matched.sort((a, b) =>
    String(a.symbol || '').localeCompare(String(b.symbol || ''))
  );

  return {
    total: matched.length,
    data: matched.slice(offset, offset + pageSize),
    as_of: tradeDate,
    price_as_of: tradeDate,
  };
}

/**
 * Selected date = listing date (listed_companies.date_of_listing).
 * PR prices attached only when bhavcopy exists for that same date.
 */
async function fetchStocksByListingDate({
  listingDate,
  searchTerm,
  pageSize,
  offset,
}) {
  const andClauses = [
    // date_of_listing is a DATE column — compare directly to YYYY-MM-DD
    { date_of_listing: listingDate },
  ];

  if (searchTerm) {
    andClauses.push({
      [Op.or]: [
        { symbol: { [Op.like]: `%${searchTerm}%` } },
        { name: { [Op.like]: `%${searchTerm}%` } },
      ],
    });
  }

  const result = await ListedCompanies.findAndCountAll({
    where: {
      series: { [Op.in]: STOCK_SERIES },
      [Op.and]: andClauses,
    },
    limit: pageSize,
    offset,
    order: [
      ['date_of_listing', 'DESC'],
      ['symbol', 'ASC'],
    ],
  });

  // Attach PR prices for the same calendar day when available.
  const prByName = new Map();
  const prExists = await PR.count({ where: prSourceDateWhere(listingDate) });
  if (prExists) {
    const prRows = await PR.findAll({
      where: prSourceDateWhere(listingDate),
      raw: true,
    });
    for (const row of prRows) {
      const key = normalizeName(row.SECURITY);
      if (key && !prByName.has(key)) prByName.set(key, row);
    }
  }

  const data = result.rows.map((company) => {
    const plain = typeof company.get === 'function' ? company.get({ plain: true }) : company;
    const prRow = prByName.get(normalizeName(plain.name)) || null;
    return mapListedRow(plain, prRow, prRow ? listingDate : null);
  });

  return {
    total: result.count,
    data,
    as_of: listingDate,
    price_as_of: prByName.size ? listingDate : null,
  };
}

async function fetchStocks({ date, dateField = 'listing', searchTerm, pageSize, offset }) {
  const selectedDate = normalizeTradeDate(date);
  if (!selectedDate) {
    return fetchListedCatalog({ searchTerm, pageSize, offset });
  }

  const field = String(dateField || 'listing').toLowerCase();

  // date_field=trade → PR trade date (source_date)
  if (field === 'trade' || field === 'source_date' || field === 'pr') {
    const exists = await PR.count({ where: prSourceDateWhere(selectedDate) });
    if (!exists) {
      return {
        total: 0,
        data: [],
        as_of: selectedDate,
        price_as_of: null,
      };
    }
    return fetchStocksByTradeDate({
      tradeDate: selectedDate,
      searchTerm,
      pageSize,
      offset,
    });
  }

  // Default: listed_companies.date_of_listing
  return fetchStocksByListingDate({
    listingDate: selectedDate,
    searchTerm,
    pageSize,
    offset,
  });
}

async function fetchEtfs({ date, searchTerm, pageSize, offset }) {
  const requested = normalizeTradeDate(date);
  const latest = requested || (await getLatestEtfDate());
  if (!latest) {
    return { total: 0, data: [], as_of: null };
  }

  if (requested) {
    const [check] = await sequelizeBhavcopy.query(
      `SELECT COUNT(*) AS total FROM etf
       WHERE (DATE(source_date) = :latest OR source_date = :latest)`,
      {
        replacements: { latest },
        type: QueryTypes.SELECT,
      }
    );
    if (!Number(check?.total || 0)) {
      return { total: 0, data: [], as_of: latest };
    }
  }

  const searchClause = searchTerm
    ? `AND (SYMBOL LIKE :search OR SECURITY LIKE :search)`
    : '';

  const countRows = await sequelizeBhavcopy.query(
    `SELECT COUNT(*) AS total FROM etf
     WHERE (DATE(source_date) = :latest OR source_date = :latest) ${searchClause}`,
    {
      replacements: { latest, search: `%${searchTerm}%` },
      type: QueryTypes.SELECT,
    }
  );

  const rows = await sequelizeBhavcopy.query(
    `SELECT id, SYMBOL AS symbol, SECURITY AS name, SERIES AS series,
            CLOSE_PRICE AS close_price, PREVIOUS_CLOSE_PRICE AS previous_close,
            OPEN_PRICE AS open_price, HIGH_PRICE AS high_price, LOW_PRICE AS low_price,
            NET_TRADED_QTY AS volume, UNDERLYING AS underlying, source_date
     FROM etf
     WHERE (DATE(source_date) = :latest OR source_date = :latest) ${searchClause}
     ORDER BY SYMBOL ASC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: {
        latest,
        search: `%${searchTerm}%`,
        limit: pageSize,
        offset,
      },
      type: QueryTypes.SELECT,
    }
  );

  const data = rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    series: row.series || 'ETF',
    close_price: row.close_price,
    previous_close: row.previous_close,
    open_price: row.open_price,
    high_price: row.high_price,
    low_price: row.low_price,
    volume: row.volume,
    underlying: row.underlying,
    date_of_listing: null,
    face_value: null,
    paid_up_value: null,
    market_lot: null,
    isin: null,
    source_date: row.source_date,
    instrument_type: 'etfs',
    source: 'etf',
  }));

  return {
    total: Number(countRows[0]?.total || 0),
    data,
    as_of: latest,
  };
}

async function fetchIndices({ searchTerm, pageSize, offset }) {
  const whereClause = searchTerm
    ? {
        [Op.or]: [
          { indexsymbol: { [Op.like]: `%${searchTerm}%` } },
          { col_index: { [Op.like]: `%${searchTerm}%` } },
          { col_key: { [Op.like]: `%${searchTerm}%` } },
        ],
      }
    : {};

  const result = await AllIndices.findAndCountAll({
    where: whereClause,
    limit: pageSize,
    offset,
    order: [['col_index', 'ASC']],
  });

  const data = result.rows.map((row) => {
    const plain = row.get({ plain: true });
    return {
      id: plain.id,
      symbol: plain.indexsymbol,
      name: plain.col_index,
      series: plain.col_key || 'INDEX',
      last: plain.last,
      previous_close: plain.previousclose,
      open: plain.col_open,
      high: plain.high,
      low: plain.low,
      percent_change: plain.percentchange,
      pe: plain.pe,
      pb: plain.pb,
      year_high: plain.yearhigh,
      year_low: plain.yearlow,
      date_of_listing: null,
      face_value: null,
      paid_up_value: null,
      market_lot: null,
      isin: null,
      instrument_type: 'indices',
      source: 'all_indices',
    };
  });

  return { total: result.count, data };
}

// GET /vap/company-data/listed-daily?instrument=stocks|etfs|indices
export const getListedDaily = asyncHandler(async (req, res) => {
  const {
    date,
    date_field = 'listing',
    search = '',
    page = 1,
    limit = 100,
    instrument = 'stocks',
  } = req.query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 100, 1);
  const offset = (pageNumber - 1) * pageSize;
  const searchTerm = String(search || '').trim();
  const instrumentType = String(instrument || 'stocks').toLowerCase();
  const tradeDate = normalizeTradeDate(date);
  const dateField = String(date_field || 'listing').toLowerCase();

  let payload = { total: 0, data: [], as_of: null, price_as_of: null };

  if (instrumentType === 'etfs' || instrumentType === 'etf') {
    payload = await fetchEtfs({
      date: tradeDate,
      searchTerm,
      pageSize,
      offset,
    });
  } else if (instrumentType === 'indices' || instrumentType === 'index') {
    payload = await fetchIndices({ searchTerm, pageSize, offset });
  } else {
    payload = await fetchStocks({
      date: tradeDate,
      dateField,
      searchTerm,
      pageSize,
      offset,
    });
  }

  const pages = Math.ceil((payload.total || 0) / pageSize) || 0;
  const normalized =
    instrumentType === 'etf'
      ? 'etfs'
      : instrumentType === 'index'
        ? 'indices'
        : instrumentType;

  res.status(200).json({
    success: true,
    date: tradeDate || null,
    date_field: instrumentType === 'stocks' ? dateField : null,
    instrument: normalized,
    as_of: payload.as_of || null,
    price_as_of: payload.price_as_of || null,
    total_records: payload.data.length,
    page: pageNumber,
    limit: pageSize,
    data: payload.data,
    pr: {
      total: 0,
      page: pageNumber,
      pages: 0,
      data: [],
    },
    listed_companies: {
      total: payload.total,
      page: pageNumber,
      pages,
      data: payload.data,
    },
  });
});
