// controllers/news.controller.js
import db from "../models/govNewsModels.js";

// 🔵 Get News On Air
export const getNewsOnAir = async (req, res) => {
  try {
    const data = await db.NewsOnAir.findAll();
    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get PIB Ministry
export const getPibMinistry = async (req, res) => {
  try {
    const data = await db.PibMinistry.findAll();
    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get PIB News
export const getPibNews = async (req, res) => {
  try {
    const data = await db.PibNews.findAll();
    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get DD News
export const getDdNews = async (req, res) => {
  try {
    const data = await db.DdNews.findAll();
    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟣 Get all news (merged)
export const getAllNews = async (req, res) => {
  try {
    const news_on_air = await db.NewsOnAir.findAll();
    const pib_ministry = await db.PibMinistry.findAll();
    const pib_news = await db.PibNews.findAll();
    const dd_news = await db.DdNews.findAll();

    res.json({
      status: "success",
      total_records: {
        news_on_air: news_on_air.length,
        pib_ministry: pib_ministry.length,
        pib_news: pib_news.length,
        dd_news: dd_news.length,
      },
      data: {
        news_on_air,
        pib_ministry,
        pib_news,
        dd_news,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟡 Get by table name (dynamic) → /news/table/news_on_air
export const getNewsByTable = async (req, res) => {
  try {
    const { table } = req.params;
    const allowed = {
      news_on_air: db.NewsOnAir,
      pib_ministry: db.PibMinistry,
      pib_news: db.PibNews,
      dd_news: db.DdNews,
    };

    if (!allowed[table]) {
      return res.status(400).json({ error: "Invalid table name" });
    }

    const data = await allowed[table].findAll();
    res.json({ status: "success", count: data.length, data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
