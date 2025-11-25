import { Op } from 'sequelize';

/**
 * Generic paginated fetch with optional search
 * @param {Model} model - Sequelize model to query
 * @param {Object} query - Request query params
 * @returns {Object} paginated result
 */
export const getPaginatedData = async (model, query) => {
  let { page = 1, limit = 100, search = '' } = query;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  const offset = (page - 1) * limit;

  // Fields to search in
  const searchableFields = ['SYMBOL', 'SECURITY', 'SERIES', 'source_date'];

  const whereClause = search
    ? {
        [Op.or]: searchableFields.map(field => ({
          [field]: { [Op.like]: `%${search}%` }
        }))
      }
    : {};

  // Avoid selecting a non-existent `id`
  const attributes = Object.keys(model.rawAttributes);

  const { rows, count } = await model.findAndCountAll({
    attributes,
    where: whereClause,
    limit,
    offset,
    order: [['source_date', 'DESC']],
  });

  return {
    total: count,
    page,
    pages: Math.ceil(count / limit),
    data: rows,
  };
};
