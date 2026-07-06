import { dbModels } from "../models/index.js";
import {
  dedupeIpoRows,
  enrichIpoRow,
  matchesStatusFilter,
  parseIpoDate,
  statusSortRank,
} from "../utils/ipoStatusUtils.js";

export const getPaginatedIpoData = async (tableName, query) => {
  const model = dbModels[tableName];
  if (!model) throw new Error(`Table ${tableName} model not found`);

  const { page = 1, limit = 10, status = "all" } = query;
  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (pageNumber - 1) * pageSize;

  const rows = await model.findAll({
    order: [["created_at", "DESC"]],
  });

  const deduped = dedupeIpoRows(rows.map(enrichIpoRow));

  const sorted = deduped.sort((a, b) => {
    const rankDiff = statusSortRank(a.issue_status) - statusSortRank(b.issue_status);
    if (rankDiff !== 0) return rankDiff;

    const aOpen = parseIpoDate(a._Issue_Open_Date) || new Date(0);
    const bOpen = parseIpoDate(b._Issue_Open_Date) || new Date(0);
    return bOpen.getTime() - aOpen.getTime();
  });

  const filtered = sorted.filter((row) =>
    matchesStatusFilter(row.issue_status, status)
  );

  const total = filtered.length;

  return {
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize) || 1,
    data: filtered.slice(offset, offset + pageSize),
  };
};
