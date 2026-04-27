import { Op } from "sequelize";
import { CronLogModel } from "../models/index.js";

export const fetchLogs = async ({
  page = 1,
  limit = 10,
  job_name,
  status,
  date,
  start_date,
  end_date,
  search,
}) => {
  try {
    const offset = (page - 1) * limit;

    // 🔹 Build dynamic WHERE condition (FOR TABLE DATA ONLY)
    const whereCondition = {};

    // 🔹 Helper: single date range
    const getDateRange = (dateStr) => {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateStr);
      end.setHours(23, 59, 59, 999);

      return { start, end };
    };

    // 🔹 Filters

    if (job_name && job_name !== "all") {
      whereCondition.job_name = job_name;
    }

    if (status && status !== "all") {
      whereCondition.status = status;
    }

    // Single date (priority)
    if (date) {
      const { start, end } = getDateRange(date);
      whereCondition.start_time = {
        [Op.between]: [start, end],
      };
    } else if (start_date && end_date) {
      const startDateTime = new Date(start_date);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);

      whereCondition.start_time = {
        [Op.between]: [startDateTime, endDateTime],
      };
    } else if (start_date) {
      const startDateTime = new Date(start_date);
      startDateTime.setHours(0, 0, 0, 0);

      whereCondition.start_time = {
        [Op.gte]: startDateTime,
      };
    } else if (end_date) {
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);

      whereCondition.start_time = {
        [Op.lte]: endDateTime,
      };
    }

    // 🔹 Search filter
    if (search && search.trim()) {
      whereCondition[Op.or] = [
        { job_name: { [Op.like]: `%${search}%` } },
        { job_group: { [Op.like]: `%${search}%` } },
        { error_message: { [Op.like]: `%${search}%` } },
      ];
    }

    // 🔹 1. Fetch paginated data
    const { rows, count } = await CronLogModel.findAndCountAll({
      where: whereCondition,
      order: [["start_time", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    // ============================================================
    // 🔥 2. GLOBAL STATUS COUNTS (NOT AFFECTED BY FILTERS)
    // ============================================================

    const statusCountsRaw = await CronLogModel.findAll({
      attributes: [
        "status",
        [
          CronLogModel.sequelize.fn(
            "COUNT",
            CronLogModel.sequelize.col("status")
          ),
          "count",
        ],
      ],
      group: ["status"],
      raw: true,
    });

    const totalRecords = await CronLogModel.count();

    const statusCounts = {
      total: totalRecords,
      success: 0,
      failed: 0,
      running: 0,
    };

    statusCountsRaw.forEach((item) => {
      const key = item.status?.toLowerCase();
      if (statusCounts[key] !== undefined) {
        statusCounts[key] = Number(item.count);
      }
    });

    // ============================================================
    // 🔹 3. UNIQUE JOB NAMES
    // ============================================================

    const uniqueJobNamesRaw = await CronLogModel.findAll({
      attributes: [
        [
          CronLogModel.sequelize.fn(
            "DISTINCT",
            CronLogModel.sequelize.col("job_name")
          ),
          "job_name",
        ],
      ],
      where: {
        job_name: {
          [Op.ne]: null,
        },
      },
      raw: true,
    });

    const jobNamesList = uniqueJobNamesRaw
      .map((item) => item.job_name)
      .filter((name) => name && name.trim());

    // ============================================================
    // 🔹 FINAL RESPONSE
    // ============================================================

    return {
      data: rows,
      pagination: {
        total: count, // filtered total
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(count / limit),
      },
      uniqueJobNames: jobNamesList,
      statusCounts, // 🔥 global stats
    };
  } catch (error) {
    console.error("Fetch Logs Service Error:", error);
    throw new Error("Failed to fetch logs");
  }
};