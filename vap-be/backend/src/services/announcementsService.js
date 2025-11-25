// services/announcements.service.js
import { Op, Sequelize } from "sequelize";

export const getAnnouncementsService = async (model,query) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    scrip = "",
    sortField = "DT_TM",
    sortOrder = "DESC",
  } = query;

  const offset = (page - 1) * limit;

  // VALID SORT FIELDS
  const allowedFields = [
    "DT_TM", "NEWS_DT", "SCRIP_CD", "HEADLINE", "CATEGORYNAME", "ANNOUNCEMENT_TYPE"
  ];

  const orderColumn = allowedFields.includes(sortField)
    ? sortField
    : "DT_TM";

  const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // SEARCH FILTERS
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { HEADLINE: { [Op.like]: `%${search}%` } },
      { CATEGORYNAME: { [Op.like]: `%${search}%` } },
      { ANNOUNCEMENT_TYPE: { [Op.like]: `%${search}%` } },
    ];
  }

  if (scrip) {
    whereClause.SCRIP_CD = scrip;
  }

  // Query DB
  const { rows, count } = await model.findAndCountAll({
    where: whereClause,
    limit: Number(limit),
    offset: Number(offset),
    order: [[orderColumn, orderDirection]],
  });

  return {
    total: count,
    page: Number(page),
    pages: Math.ceil(count / limit),
    data: rows,
  };
};
