import { dbModels } from "../models/index.js";


export const getPaginatedIpoData = async (tableName, query) => {
  const model = dbModels[tableName];
  if (!model) throw new Error(`Table ${tableName} model not found`);

  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  // Use findAndCountAll for pagination
  const { rows, count } = await model.findAndCountAll({
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["created_at", "DESC"]] // order by latest first
  });

  return {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    data: rows
  };
};
