import { dbModels } from "../models/index.js";
import {
  dedupeIpoRows,
  enrichIpoRow,
  isNseIpoRow,
  matchesStatusFilter,
  parseIpoDate,
  statusSortRank,
} from "../utils/ipoStatusUtils.js";

const IPO_TABLES = ["mainboard_data", "sme_data"];

const BOARD_FILTERS = {
  all: () => true,
  mainboard: (row) => {
    const series = String(row.security_type || "").toUpperCase();
    return series === "EQ" || series === "BE" || series === "MAINBOARD" || !series;
  },
  sme: (row) => String(row.security_type || "").toUpperCase() === "SME",
};

const loadNseRows = async () => {
  const rows = [];

  for (const tableName of IPO_TABLES) {
    const model = dbModels[tableName];
    if (!model) continue;

    const tableRows = await model.findAll({
      order: [["created_at", "DESC"]],
    });

    for (const row of tableRows) {
      const enriched = enrichIpoRow(row);
      if (isNseIpoRow(enriched)) {
        rows.push({
          ...enriched,
          type: tableName,
        });
      }
    }
  }

  return dedupeIpoRows(rows);
};

export const getNseIpoData = async (query = {}) => {
  const { page = 1, limit = 10, status = "current", board = "all" } = query;
  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (pageNumber - 1) * pageSize;

  const boardFilter = BOARD_FILTERS[String(board).toLowerCase()] || BOARD_FILTERS.all;

  const deduped = await loadNseRows();

  const filtered = deduped
    .filter((row) => matchesStatusFilter(row.issue_status, status))
    .filter(boardFilter)
    .sort((a, b) => {
      const rankDiff = statusSortRank(a.issue_status) - statusSortRank(b.issue_status);
      if (rankDiff !== 0) return rankDiff;

      const aOpen = parseIpoDate(a._Issue_Open_Date) || new Date(0);
      const bOpen = parseIpoDate(b._Issue_Open_Date) || new Date(0);
      return bOpen.getTime() - aOpen.getTime();
    });

  const total = filtered.length;

  return {
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize) || 1,
    data: filtered.slice(offset, offset + pageSize),
  };
};

export const getNseIpoCounts = async () => {
  const deduped = await loadNseRows();

  const counts = {
    current: 0,
    upcoming: 0,
    past: 0,
    mainboard: 0,
    sme: 0,
    total: deduped.length,
  };

  for (const row of deduped) {
    if (matchesStatusFilter(row.issue_status, "current")) counts.current += 1;
    if (matchesStatusFilter(row.issue_status, "upcoming")) counts.upcoming += 1;
    if (matchesStatusFilter(row.issue_status, "past")) counts.past += 1;
    if (BOARD_FILTERS.mainboard(row)) counts.mainboard += 1;
    if (BOARD_FILTERS.sme(row)) counts.sme += 1;
  }

  return counts;
};

export const getPaginatedIpoData = async (tableName, query) => {
  const model = dbModels[tableName];
  if (!model) throw new Error(`Table ${tableName} model not found`);

  const { page = 1, limit = 10, status = "current", source = "nse" } = query;
  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (pageNumber - 1) * pageSize;

  const rows = await model.findAll({
    order: [["created_at", "DESC"]],
  });

  const deduped = dedupeIpoRows(
    rows
      .map(enrichIpoRow)
      .filter((row) =>
        String(source).toLowerCase() === "nse" ? isNseIpoRow(row) : true
      )
  );

  const filtered = deduped
    .filter((row) => matchesStatusFilter(row.issue_status, status))
    .sort((a, b) => {
      const rankDiff = statusSortRank(a.issue_status) - statusSortRank(b.issue_status);
      if (rankDiff !== 0) return rankDiff;

      const aOpen = parseIpoDate(a._Issue_Open_Date) || new Date(0);
      const bOpen = parseIpoDate(b._Issue_Open_Date) || new Date(0);
      return bOpen.getTime() - aOpen.getTime();
    });

  const total = filtered.length;

  return {
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize) || 1,
    data: filtered.slice(offset, offset + pageSize),
  };
};
