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

const isSmeBoard = (row = {}) =>
  row.type === "sme_data" ||
  String(row.security_type || "").toUpperCase() === "SME";

const BOARD_FILTERS = {
  all: () => true,
  // Partition: every NSE row is either SME or mainboard (no orphan types).
  mainboard: (row) => !isSmeBoard(row),
  sme: isSmeBoard,
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

  const emptyBoard = () => ({ all: 0, mainboard: 0, sme: 0 });

  const counts = {
    current: 0,
    upcoming: 0,
    past: 0,
    mainboard: 0,
    sme: 0,
    total: deduped.length,
    // Board badges must follow the selected status tab (not global totals).
    byStatus: {
      current: emptyBoard(),
      upcoming: emptyBoard(),
      past: emptyBoard(),
    },
  };

  for (const row of deduped) {
    const isMainboard = BOARD_FILTERS.mainboard(row);
    const isSme = BOARD_FILTERS.sme(row);

    if (isMainboard) counts.mainboard += 1;
    if (isSme) counts.sme += 1;

    for (const status of ["current", "upcoming", "past"]) {
      if (!matchesStatusFilter(row.issue_status, status)) continue;

      counts[status] += 1;
      counts.byStatus[status].all += 1;
      if (isMainboard) counts.byStatus[status].mainboard += 1;
      if (isSme) counts.byStatus[status].sme += 1;
    }
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
