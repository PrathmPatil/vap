import { Op, fn, col, where, literal } from 'sequelize';
import { Watchlist, ListedCompanies, PR } from '../models/index.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ensureWatchlistTable = async () => {
  try {
    await Watchlist.sync();
  } catch {
    // ignore
  }
};

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const compactName = (value) =>
  normalizeName(value)
    .replace(/\b(limited|ltd|ltd\.|private|pvt|pvt\.|corporation|corp|company|co)\b/g, '')
    .replace(/[^a-z0-9]+/g, '');

const toNum = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const prUsableStatusWhere = () =>
  literal(
    `(status IS NULL OR TRIM(status) = '' OR UPPER(TRIM(status)) = 'OK' OR UPPER(TRIM(status)) <> 'MISSING')`
  );

const resolveLatestPrDate = async () => {
  const row = await PR.findOne({
    attributes: [[fn('MAX', col('source_date')), 'latest']],
    where: { source_date: { [Op.ne]: null } },
    raw: true,
  });
  const raw = row?.latest;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw.slice(0, 10);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const findLatestQuote = async (companyName, tradeDate) => {
  if (!companyName || !tradeDate) return null;

  const exact = await PR.findOne({
    where: {
      [Op.and]: [
        where(fn('DATE', col('source_date')), tradeDate),
        prUsableStatusWhere(),
        where(fn('LOWER', col('SECURITY')), normalizeName(companyName)),
      ],
    },
    raw: true,
  });
  if (exact) return exact;

  // Fallback for name variants (Limited vs LTD, etc.)
  const rows = await PR.findAll({
    where: {
      [Op.and]: [
        where(fn('DATE', col('source_date')), tradeDate),
        prUsableStatusWhere(),
        {
          SECURITY: {
            [Op.like]: `%${String(companyName).trim().split(/\s+/)[0]}%`,
          },
        },
      ],
    },
    attributes: [
      'SECURITY',
      'OPEN_PRICE',
      'HIGH_PRICE',
      'LOW_PRICE',
      'CLOSE_PRICE',
      'PREV_CL_PR',
      'NET_TRDQTY',
      'source_date',
    ],
    raw: true,
    limit: 50,
  });

  const target = compactName(companyName);
  if (!target) return null;

  return (
    rows.find((row) => {
      const candidate = compactName(row.SECURITY);
      return (
        candidate === target ||
        candidate.includes(target) ||
        target.includes(candidate)
      );
    }) || null
  );
};

export const addToWatchlist = asyncHandler(async (req, res) => {
  await ensureWatchlistTable();
  const user = req.user || req.body.user || req.headers['x-user'];
  const userId = user?.id || (req.user && req.user.id) || req.body.user_id;
  const { symbol } = req.body;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

  const [entry, created] = await Watchlist.findOrCreate({
    where: { user_id: userId, symbol },
  });
  res.status(200).json({ success: true, created, data: entry });
});

export const removeFromWatchlist = asyncHandler(async (req, res) => {
  await ensureWatchlistTable();
  const user = req.user || req.body.user || req.headers['x-user'];
  const userId = user?.id || (req.user && req.user.id) || req.body.user_id;
  const { symbol } = req.params;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

  const deleted = await Watchlist.destroy({ where: { user_id: userId, symbol } });
  res.status(200).json({ success: true, deleted: !!deleted });
});

export const getUserWatchlist = asyncHandler(async (req, res) => {
  await ensureWatchlistTable();
  const user = req.user || req.headers['x-user'];
  const userId = user?.id || (req.user && req.user.id);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const items = await Watchlist.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });

  const tradeDate = await resolveLatestPrDate();
  const results = [];

  for (const it of items) {
    const company = await ListedCompanies.findOne({
      where: { symbol: it.symbol },
      raw: true,
    });

    const quote = await findLatestQuote(company?.name, tradeDate);

    results.push({
      symbol: it.symbol,
      name: company?.name || it.symbol,
      series: company?.series || '',
      sector: company?.series || '',
      date_of_listing: company?.date_of_listing || null,
      isin: company?.isin || null,
      addedAt: it.created_at,
      as_of: tradeDate,
      latest: quote
        ? {
            date: tradeDate,
            open: toNum(quote.OPEN_PRICE),
            high: toNum(quote.HIGH_PRICE),
            low: toNum(quote.LOW_PRICE),
            close: toNum(quote.CLOSE_PRICE),
            previous_close: toNum(quote.PREV_CL_PR),
            volume: toNum(quote.NET_TRDQTY),
          }
        : null,
    });
  }

  res.status(200).json({
    success: true,
    as_of: tradeDate,
    data: results,
  });
});
