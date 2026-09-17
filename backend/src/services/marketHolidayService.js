import { Op } from "sequelize";
import { MarketHolidayModel, PR } from "../models/index.js";
import { fetchLogsByTradeDate } from "./cronLogService.js";

const pad2 = (n) => String(n).padStart(2, "0");

const toDateOnly = (value) => {
  if (!value) return null;
  const str = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
};

const monthBounds = (year, month) => {
  const y = Number(year);
  const m = Number(month);
  const start = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { start, end, year: y, month: m };
};

const iterateDays = (startStr, endStr) => {
  const days = [];
  const cursor = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

export const getCoverageCalendar = async ({ year, month }) => {
  const bounds = monthBounds(year, month);
  const today = new Date().toISOString().slice(0, 10);

  const { QueryTypes } = await import("sequelize");

  const fetchedRows = await PR.sequelize.query(
    `
    SELECT DISTINCT DATE(source_date) AS trade_date
    FROM \`pr\`
    WHERE source_date IS NOT NULL
      AND TRIM(source_date) <> ''
      AND DATE(source_date) BETWEEN :start AND :end
    ORDER BY trade_date ASC
    `,
    {
      replacements: { start: bounds.start, end: bounds.end },
      type: QueryTypes.SELECT,
    }
  );

  const fetchedSet = new Set(
    (fetchedRows || [])
      .map((row) => toDateOnly(row.trade_date))
      .filter(Boolean)
  );

  const holidayRows = await MarketHolidayModel.findAll({
    attributes: ["holiday_date", "description", "day", "segment"],
    where: {
      is_active: 1,
      holiday_date: { [Op.between]: [bounds.start, bounds.end] },
    },
    order: [["holiday_date", "ASC"]],
    raw: true,
  });

  const holidayMap = new Map();
  for (const row of holidayRows || []) {
    const key = toDateOnly(row.holiday_date);
    if (!key || holidayMap.has(key)) continue;
    holidayMap.set(key, {
      description: row.description || "Market holiday",
      day: row.day || null,
      segment: row.segment || null,
    });
  }

  const days = [];
  let counts = { fetched: 0, holiday: 0, missing: 0, weekend: 0, future: 0 };

  for (const dateStr of iterateDays(bounds.start, bounds.end)) {
    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const holiday = holidayMap.get(dateStr) || null;

    let status;
    if (isWeekend) {
      status = "weekend";
      counts.weekend += 1;
    } else if (holiday) {
      status = "holiday";
      counts.holiday += 1;
    } else if (fetchedSet.has(dateStr)) {
      status = "fetched";
      counts.fetched += 1;
    } else if (dateStr > today) {
      status = "future";
      counts.future += 1;
    } else {
      status = "missing";
      counts.missing += 1;
    }

    days.push({
      date: dateStr,
      status,
      ...(holiday
        ? {
            holiday_description: holiday.description,
            holiday_day: holiday.day,
            holiday_segment: holiday.segment,
          }
        : {}),
    });
  }

  return {
    year: bounds.year,
    month: bounds.month,
    start_date: bounds.start,
    end_date: bounds.end,
    today,
    counts,
    fetched_dates: [...fetchedSet].sort(),
    missing_dates: days
      .filter((d) => d.status === "missing")
      .map((d) => d.date),
    days,
  };
};

export const getCoverageDateDetail = async ({ date }) => {
  const dateStr = toDateOnly(date);
  if (!dateStr) {
    throw new Error("Valid date (YYYY-MM-DD) is required");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { QueryTypes } = await import("sequelize");

  const countRows = await PR.sequelize.query(
    `
    SELECT COUNT(*) AS cnt
    FROM \`pr\`
    WHERE source_date IS NOT NULL
      AND TRIM(source_date) <> ''
      AND DATE(source_date) = :date
    `,
    {
      replacements: { date: dateStr },
      type: QueryTypes.SELECT,
    }
  );
  const pr_record_count = Number(countRows?.[0]?.cnt || 0);

  const holidayRow = await MarketHolidayModel.findOne({
    attributes: ["holiday_date", "description", "day", "segment"],
    where: {
      is_active: 1,
      holiday_date: dateStr,
    },
    raw: true,
  });

  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  const holiday = holidayRow
    ? {
        description: holidayRow.description || "Market holiday",
        day: holidayRow.day || null,
        segment: holidayRow.segment || null,
      }
    : null;

  let status;
  if (isWeekend) {
    status = "weekend";
  } else if (holiday) {
    status = "holiday";
  } else if (pr_record_count > 0) {
    status = "fetched";
  } else if (dateStr > today) {
    status = "future";
  } else {
    status = "missing";
  }

  const historyRows = await fetchLogsByTradeDate(dateStr, { limit: 100 });

  return {
    date: dateStr,
    status,
    pr_record_count,
    is_weekend: isWeekend,
    ...(holiday
      ? {
          holiday_description: holiday.description,
          holiday_day: holiday.day,
          holiday_segment: holiday.segment,
        }
      : {}),
    history: historyRows.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return plain;
    }),
  };
};

export const fetchHolidays = async ({ page = 1, limit = 10, search }) => {
  try {
    const offset = (page - 1) * limit;

    const whereCondition = {
      is_active: 1,
      ...(search && {
        description: {
          [Op.like]: `%${search}%`,
        },
      }),
    };

    // 🔹 Fetch ALL matching rows (not grouped)
    const rows = await MarketHolidayModel.findAll({
      where: whereCondition,
      order: [["holiday_date", "DESC"]],
      raw: true,
    });

    // 🔹 Group in Node.js
    const groupedMap = {};

    rows.forEach((row) => {
      const key = `${row.holiday_date}_${row.description}`;

      if (!groupedMap[key]) {
        groupedMap[key] = {
          holiday_date: row.holiday_date,
          day: row.day,
          description: row.description,
          segments: [],
        };
      }

      groupedMap[key].segments.push(row.segment);
    });

    // 🔹 Convert to array
    const groupedData = Object.values(groupedMap);

    // 🔹 Pagination AFTER grouping
    const total = groupedData.length;
    const paginatedData = groupedData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Fetch Holidays Error:", error);
    throw new Error("Failed to fetch holidays");
  }
};