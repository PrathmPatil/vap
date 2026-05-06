import { Op } from 'sequelize';
import { Watchlist, ListedCompanies, PR } from '../models/index.js';

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Ensure table exists before operations
const ensureWatchlistTable = async () => {
  try {
    await Watchlist.sync();
  } catch (e) {
    // ignore
  }
};

export const addToWatchlist = asyncHandler(async (req, res) => {
  await ensureWatchlistTable();
  const user = req.user || req.body.user || req.headers['x-user'];
  const userId = user?.id || (req.user && req.user.id) || req.body.user_id;
  const { symbol } = req.body;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

  const [entry, created] = await Watchlist.findOrCreate({ where: { user_id: userId, symbol } });
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

  const items = await Watchlist.findAll({ where: { user_id: userId } });

  // For each symbol fetch company metadata and the latest PR row
  const results = [];
  for (const it of items) {
    const company = await ListedCompanies.findOne({ where: { symbol: it.symbol } });
    const latest = await PR.findOne({
      where: {
        SECURITY: {
          [Op.like]: `%${company?.name || it.symbol}%`
        }
      },
      order: [['source_date', 'DESC']]
    });

    results.push({
      symbol: it.symbol,
      name: company?.name || it.symbol,
      sector: company?.series || '',
      addedAt: it.created_at,
      latest: latest
        ? {
            symbol: latest.symbol,
        date: latest.source_date,
            open: latest.open,
            high: latest.high,
            low: latest.low,
            close: latest.close,
            volume: latest.volume
          }
        : null
    });
  }

  res.status(200).json({ success: true, data: results });
});
