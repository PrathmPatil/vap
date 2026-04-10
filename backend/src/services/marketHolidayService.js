import { Op } from "sequelize";
import { MarketHolidayModel } from "../models/index.js";

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