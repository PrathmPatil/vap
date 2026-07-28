import { Op, fn, col, where as sequelizeWhere } from 'sequelize';

/**
 * Generic paginated fetch with optional search + date filters
 * @param {Model} model - Sequelize model to query
 * @param {Object} query - Request query params
 * @returns {Object} paginated result
 */
export const getPaginatedData = async (model, query) => {
  let {
    page = 1,
    limit = 100,
    search = '',
    date = '',
    start_date = '',
    end_date = '',
  } = query;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  const offset = (page - 1) * limit;

  // Fields to search in
  const searchableFields = ['SYMBOL', 'SECURITY', 'SERIES', 'source_date'];
  const conditions = [];

  if (search) {
    conditions.push({
      [Op.or]: searchableFields.map(field => ({
        [field]: { [Op.like]: `%${search}%` }
      }))
    });
  }

  // Date-wise filter on source_date (supports single day or range)
  const hasSourceDate = Boolean(model.rawAttributes?.source_date);
  if (hasSourceDate) {
    if (date) {
      conditions.push(sequelizeWhere(fn('DATE', col('source_date')), date));
    } else if (start_date || end_date) {
      if (start_date && end_date) {
        conditions.push(
          sequelizeWhere(fn('DATE', col('source_date')), {
            [Op.between]: [start_date, end_date],
          })
        );
      } else if (start_date) {
        conditions.push(
          sequelizeWhere(fn('DATE', col('source_date')), {
            [Op.gte]: start_date,
          })
        );
      } else if (end_date) {
        conditions.push(
          sequelizeWhere(fn('DATE', col('source_date')), {
            [Op.lte]: end_date,
          })
        );
      }
    }
  }

  const whereClause = conditions.length
    ? { [Op.and]: conditions }
    : {};

  // Avoid selecting a non-existent `id`
  const attributes = Object.keys(model.rawAttributes);

  const { rows, count } = await model.findAndCountAll({
    attributes,
    where: whereClause,
    limit,
    offset,
    order: hasSourceDate ? [['source_date', 'DESC']] : undefined,
  });

  return {
    total: count,
    page,
    pages: Math.ceil(count / limit),
    data: rows,
  };
};
