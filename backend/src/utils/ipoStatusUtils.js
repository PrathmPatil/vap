const STATUS_GROUPS = {
  current: ["Active"],
  ongoing: ["Active"],
  upcoming: ["Forthcoming"],
  past: ["Closed", "Listed"],
};

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export const parseIpoDate = (value) => {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i);
  if (dmy) {
    const month = MONTHS[dmy[2].toLowerCase()];
    if (month === undefined) return null;
    const date = new Date(Number(dmy[3]), month, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const deriveIpoStatus = (row = {}) => {
  const today = startOfDay(new Date());
  const openDate = parseIpoDate(row._Issue_Open_Date || row.Open_Date);
  const closeDate = parseIpoDate(
    row._Issue_Close_Date || row.Close_Date || row.close_date
  );
  const listingDate = parseIpoDate(row.listing_date);
  const hasDates = Boolean(openDate || closeDate || listingDate);

  // Prefer calendar dates over a stale DB status (e.g. still "Active" after close).
  if (hasDates) {
    if (listingDate && startOfDay(listingDate) <= today) {
      return "Listed";
    }

    if (closeDate && startOfDay(closeDate) < today) {
      return "Closed";
    }

    if (openDate && startOfDay(openDate) > today) {
      return "Forthcoming";
    }

    if (
      openDate &&
      closeDate &&
      startOfDay(openDate) <= today &&
      today <= startOfDay(closeDate)
    ) {
      return "Active";
    }

    if (openDate && !closeDate && startOfDay(openDate) <= today) {
      return "Active";
    }
  }

  const explicit = String(row.issue_status || "").trim();
  if (explicit) return explicit;

  return "Closed";
};

export const matchesStatusFilter = (status, filter) => {
  const normalized = String(filter || "current").toLowerCase();
  if (normalized === "all") return true;

  const allowed = STATUS_GROUPS[normalized];
  if (allowed) return allowed.includes(status);

  return status === filter;
};

export const isNseIpoRow = (row = {}) => {
  if (String(row.data_source || "").toLowerCase() === "nse") {
    return true;
  }

  const company = String(row.Company_Name || "");
  if (company.includes("<a href")) {
    return false;
  }

  const symbol = String(row._id || "").trim();
  const slug = String(row._URLRewrite_Folder_Name || "").trim();

  return Boolean(symbol) && symbol === slug && /^[A-Z0-9]+$/.test(symbol);
};

export const getIpoDedupKey = (row = {}) => {
  if (row._id && isNseIpoRow(row)) return String(row._id);
  if (row._URLRewrite_Folder_Name) return String(row._URLRewrite_Folder_Name);

  const company = String(row.Company_Name || "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .toLowerCase();

  return company || `row-${row.id}`;
};

export const dedupeIpoRows = (rows = []) => {
  const latestByKey = new Map();

  for (const row of rows) {
    const key = getIpoDedupKey(row);
    const existing = latestByKey.get(key);

    if (!existing) {
      latestByKey.set(key, row);
      continue;
    }

    const existingCreated = new Date(existing.created_at || 0).getTime();
    const rowCreated = new Date(row.created_at || 0).getTime();

    if (rowCreated >= existingCreated) {
      latestByKey.set(key, row);
    }
  }

  return Array.from(latestByKey.values());
};

export const statusSortRank = (status) => {
  switch (status) {
    case "Active":
      return 1;
    case "Forthcoming":
      return 2;
    case "Closed":
      return 3;
    case "Listed":
      return 4;
    default:
      return 5;
  }
};

export const enrichIpoRow = (row) => {
  const json = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  const issue_status = deriveIpoStatus(json);

  return {
    ...json,
    issue_status,
  };
};
