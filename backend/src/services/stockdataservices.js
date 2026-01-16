
import { Op, where, fn, col } from "sequelize";

/**
 * Generic paginated fetch with optional search
 * @param {Model} model - Sequelize model to query
 * @param {Object} query - Request query params
 */
export const getPaginatedData = async (model, query, orderBy) => {
  const { page = 1, limit = 1000, search = '' } = query;

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
    offset: parseInt(offset),
    order: [[orderBy, 'DESC']]
  });

  return {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};



export const getPaginatedDataBySymbol = async (model, req, orderBy) => {
  const { page = 1, limit = 100, search = "" } = req.query;
  const { symbol: paramSymbol } = req.params || {};

  if (!paramSymbol) {
    throw new Error("Symbol is required in URL.");
  }

  const offset = (page - 1) * limit;

  let whereClause = {
    [Op.and]: [
      where(fn("LOWER", fn("TRIM", col("symbol"))), {
        [Op.eq]: paramSymbol.trim().toLowerCase()
      })
    ]
  };

  if (search) {
    whereClause[Op.or] = [
      where(fn("LOWER", fn("TRIM", col("symbol"))), {
        [Op.like]: `%${search.trim().toLowerCase()}%`
      })
    ];
  }

  const { rows, count } = await model.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[orderBy, "DESC"]]
  });

  if (!rows.length) {
    return { success: false, message: "No data found", data: [] };
  }

  return {
    success: true,
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};
