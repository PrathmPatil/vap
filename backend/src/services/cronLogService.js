import { Op } from "sequelize";
import { CronLogModel } from "../models/index.js";

export const fetchLogs = async ({ page = 1, limit = 10, job_name, status }) => {
  try {
    const offset = (page - 1) * limit;

    // 🔹 Build dynamic where condition
    const whereCondition = {
      ...(job_name && { job_name }),
      ...(status && { status }),
    };

    // 🔹 Fetch data
    const { rows, count } = await CronLogModel.findAndCountAll({
      where: whereCondition,
      order: [["created_at", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error("Fetch Logs Service Error:", error);
    throw new Error("Failed to fetch logs");
  }
};