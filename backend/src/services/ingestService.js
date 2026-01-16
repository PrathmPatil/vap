import { Op } from "sequelize";

export const getPaginatedNseData = async (model, params) => {
  const {
    page = 1,
    limit = 20,
    q = null,
    sort_by = "id",
    sort_order = "DESC",
  } = params;

  const offset = (page - 1) * limit;

  // Extract model columns
  const attributes = Object.keys(model.rawAttributes);

  // Validate column exists before sorting
  const safeSortColumn = attributes.includes(sort_by) ? sort_by : "id";

  // -----------------------------
  // SEARCH HANDLING
  // -----------------------------
  let where = {};

  if (q) {
    // Only search in string columns
    const searchableCols = attributes.filter(
      (col) => model.rawAttributes[col].type.key.includes("STRING") ||
               model.rawAttributes[col].type.key.includes("TEXT")
    );

    if (searchableCols.length > 0) {
      where = {
        [Op.or]: searchableCols.map((col) => ({
          [col]: { [Op.like]: `%${q}%` }
        }))
      };
    }
  }

  // -----------------------------
  // PAGINATION QUERY
  // -----------------------------
  const { rows, count } = await model.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[safeSortColumn, sort_order.toUpperCase()]],
  });

  return {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    limit: parseInt(limit),
    data: rows,
  };
};
