import { ListedCompanies } from '../models/index.js';
import { Op } from 'sequelize';

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /vap/company-data/listed-daily
export const getListedDaily = asyncHandler(async (req, res) => {
  const { date, search = '', page = 1, limit = 100 } = req.query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 100, 1);
  const offset = (pageNumber - 1) * pageSize;

  const searchTerm = String(search || '').trim();

  const listedCompaniesResult = await ListedCompanies.findAndCountAll({
      where: searchTerm
        ? {
            [Op.or]: [
              { symbol: { [Op.like]: `%${searchTerm}%` } },
              { name: { [Op.like]: `%${searchTerm}%` } }
            ]
          }
        : {},
      limit: pageSize,
      offset,
      order: [['date_of_listing', 'DESC']]
    });

  const displayRows = listedCompaniesResult.rows.map((company) => ({
    id: company.id,
    symbol: company.symbol,
    name: company.name,
    series: company.series,
    date_of_listing: company.date_of_listing,
    paid_up_value: company.paid_up_value,
    market_lot: company.market_lot,
    isin: company.isin,
    face_value: company.face_value,
    source: 'listed_companies'
  }));

  res.status(200).json({
    success: true,
    date: date || null,
    total_records: displayRows.length,
    page: pageNumber,
    limit: pageSize,
    data: displayRows,
    pr: {
      total: 0,
      page: pageNumber,
      pages: 0,
      data: []
    },
    listed_companies: {
      total: listedCompaniesResult.count,
      page: pageNumber,
      pages: Math.ceil(listedCompaniesResult.count / pageSize),
      data: listedCompaniesResult.rows
    }
  });
});
