// controllers/news.controller.js
import axios from "axios";
import db from "../models/govNewsModels.js";
import { QueryTypes } from "sequelize";

const govNewsHttp = axios.create({
  baseURL: "https://www.india.gov.in",
  timeout: 30000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Origin: "https://www.india.gov.in",
    Referer: "https://www.india.gov.in/",
    "X-Requested-With": "XMLHttpRequest"
  }
});

const TABLES = {
  news_on_air: "news_on_air",
  pib_ministry: "pib_ministry",
  pib_news: "pib_news",
  dd_news: "dd_news"
};

const normalizeNewsOnAir = (row) => ({
  id: row.id,
  title: row.title || row.headline || "",
  body: row.body || row.description || "",
  image: row.image || "",
  news_category: row.news_category || row.category || "",
  updatedAt: row.updatedAt || row.updatedat || row.updated_at || row.pubdate || row.created_at || "",
  url: row.url || row.link || ""
});

const normalizePibMinistry = (row) => ({
  id: row.id,
  ministry_id: row.ministry_id || row.ministryid || row.id || "",
  title: row.title || row.name || ""
});

const normalizePibNews = (row) => ({
  id: row.id,
  title: row.title || row.headline || "",
  ministry_title: row.ministry_title || row.npiMinistry || row.npiministry || "",
  source: row.source || "PIB",
  createdAt: row.createdAt || row.created_at || row.pubdate || "",
  url: row.url || row.link || ""
});

const normalizeDdNews = (row) => ({
  id: row.id,
  title: row.title || row.headline || "",
  image: row.image || "",
  news_category: row.news_category || row.category || "",
  source: row.source || "DD",
  createdAt: row.createdAt || row.created_at || row.pubdate || "",
  url: row.url || row.link || ""
});

const tableNormalizer = {
  news_on_air: normalizeNewsOnAir,
  pib_ministry: normalizePibMinistry,
  pib_news: normalizePibNews,
  dd_news: normalizeDdNews
};

const pythonGovNewsBaseUrl =
  process.env.PYTHON_GOV_NEWS_BASE_URL || "http://127.0.0.1:8080/ml";

const fetchGovNewsFromPython = async (sortOrder) => {
  const baseUrl = pythonGovNewsBaseUrl.replace(/\/+$/, "");

  try {
    await axios.post(
      `${baseUrl}/gov-news/fetch-all`,
      {},
      { timeout: 30000 }
    );
  } catch (error) {
    // Ignore refresh failures and try to read whatever is already available.
  }

  const response = await axios.get(`${baseUrl}/gov-news/all`, {
    params: { sortOrder },
    timeout: 30000
  });

  return response.data;
};

const extractResults = (responseData) => {
  if (!responseData) {
    return [];
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (typeof responseData !== "object") {
    return [];
  }

  if (Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (responseData.data && Array.isArray(responseData.data.results)) {
    return responseData.data.results;
  }

  if (responseData.data && Array.isArray(responseData.data.items)) {
    return responseData.data.items;
  }

  if (Array.isArray(responseData.results)) {
    return responseData.results;
  }

  if (Array.isArray(responseData.items)) {
    return responseData.items;
  }

  if (Array.isArray(responseData.Table)) {
    return responseData.Table;
  }

  const nestedArrays = Object.values(responseData)
    .map((value) => extractResults(value))
    .find((array) => Array.isArray(array) && array.length > 0);

  if (nestedArrays) {
    return nestedArrays;
  }

  return [];
};

const normalizeLiveNewsOnAir = (row, index) => ({
  id: row.id ?? index + 1,
  title: row.title || row.HEADLINE || row.headline || row.name || "",
  body: row.body || row.description || row.NEWSSUB || row.summary || "",
  image: row.image || row.IMAGE || "",
  news_category: row.news_category || row.category || row.CATEGORYNAME || row.type || "",
  updatedAt: row.updatedAt || row.updated_at || row.updatedat || row.DissemDT || row.pubdate || row.created_at || "",
  url: row.url || row.link || row.NSURL || ""
});

const normalizeLivePibMinistry = (row, index) => ({
  id: row.id ?? index + 1,
  ministry_id: row.ministry_id || row.ministryId || row.ministryid || row.id || "",
  title: row.title || row.name || row.ministry_title || row.ministryTitle || row.description || ""
});

const normalizeLivePibNews = (row, index) => ({
  id: row.id ?? index + 1,
  title: row.title || row.HEADLINE || row.headline || "",
  ministry_title: row.ministry_title || row.ministryTitle || row.npiMinistry || row.department || row.source || "",
  source: row.source || row.SLONGNAME || "PIB",
  createdAt: row.createdAt || row.created_at || row.pubdate || row.DissemDT || "",
  url: row.url || row.link || row.NSURL || ""
});

const normalizeLiveDdNews = (row, index) => ({
  id: row.id ?? index + 1,
  title: row.title || row.HEADLINE || row.headline || "",
  image: row.image || row.IMAGE || "",
  news_category: row.news_category || row.category || row.CATEGORYNAME || "",
  source: row.source || row.SLONGNAME || "DD",
  createdAt: row.createdAt || row.created_at || row.pubdate || row.DissemDT || "",
  url: row.url || row.link || row.NSURL || ""
});

const normalizeLiveGovNews = (tableName, rows) => {
  const data = Array.isArray(rows) ? rows : [];

  switch (tableName) {
    case TABLES.news_on_air:
      return data.map((row, index) => normalizeLiveNewsOnAir(row, index));
    case TABLES.pib_ministry:
      return data.map((row, index) => normalizeLivePibMinistry(row, index));
    case TABLES.pib_news:
      return data.map((row, index) => normalizeLivePibNews(row, index));
    case TABLES.dd_news:
      return data.map((row, index) => normalizeLiveDdNews(row, index));
    default:
      return data;
  }
};

const fetchGovNewsLive = async () => {
  const requests = [
    {
      table: TABLES.news_on_air,
      endpoint: "/news/news-on-air/dataservices/getnewsonair",
      params: { pageNumber: 1, pageSize: 100 }
    },
    {
      table: TABLES.pib_ministry,
      endpoint: "/news/pib-news/dataservices/getpibministry",
      params: { pageNumber: 1, pageSize: 100 }
    },
    {
      table: TABLES.pib_news,
      endpoint: "/news/pib-news/dataservices/getpibnews",
      params: { npiFilters: [], pageNumber: 1, pageSize: 50 }
    },
    {
      table: TABLES.dd_news,
      endpoint: "/news/dd-news/dataservices/getddnews",
      params: { mustFilter: [], pageNumber: 1, pageSize: 50 }
    }
  ];

  const settled = await Promise.allSettled(
    requests.map(async ({ table, endpoint, params }) => {
      const response = await govNewsHttp.post(endpoint, params);
      const rows = extractResults(response.data);
      return [table, normalizeLiveGovNews(table, rows)];
    })
  );

  const data = {
    news_on_air: [],
    pib_ministry: [],
    pib_news: [],
    dd_news: []
  };

  for (const item of settled) {
    if (item.status === "fulfilled") {
      const [table, rows] = item.value;
      data[table] = rows;
    }
  }

  return {
    status: "success",
    total_records: {
      news_on_air: data.news_on_air.length,
      pib_ministry: data.pib_ministry.length,
      pib_news: data.pib_news.length,
      dd_news: data.dd_news.length,
    },
    data,
  };
};

const hasAnyGovNewsRows = (response) => {
  if (!response || !response.total_records) {
    return false;
  }

  return Object.values(response.total_records).some(
    (count) => Number(count) > 0
  );
};

const tableExists = async (tableName) => {
  try {
    const rows = await db.sequelize.query("SHOW TABLES LIKE :tableName", {
      replacements: { tableName },
      type: QueryTypes.SELECT
    });

    return rows.length > 0;
  } catch (error) {
    return false;
  }
};

const readTableRows = async (tableName, sortOrder = "DESC") => {
  try {
    const exists = await tableExists(tableName);
    if (!exists) return [];

    const direction = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const rows = await db.sequelize.query(
      `SELECT * FROM \`${tableName}\` ORDER BY id ${direction}`,
      { type: QueryTypes.SELECT }
    );

    const normalize = tableNormalizer[tableName] || ((row) => row);
    return rows.map(normalize);
  } catch (error) {
    return [];
  }
};

const buildLocalGovNewsResponse = async (sortOrder) => {
  try {
    const news_on_air = await readTableRows(TABLES.news_on_air, sortOrder);
    const pib_ministry = await readTableRows(TABLES.pib_ministry, sortOrder);
    const pib_news = await readTableRows(TABLES.pib_news, sortOrder);
    const dd_news = await readTableRows(TABLES.dd_news, sortOrder);

    return {
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
      },
    };
  } catch (error) {
    return {
      status: "success",
      total_records: {
        news_on_air: 0,
        pib_ministry: 0,
        pib_news: 0,
        dd_news: 0,
      },
      data: {
        news_on_air: [],
        pib_ministry: [],
        pib_news: [],
        dd_news: [],
      },
    };
  }
};

// 🔵 Get News On Air
export const getNewsOnAir = async (req, res) => {
  try {
    let data = await readTableRows(TABLES.news_on_air, req.query.sortOrder);

    if (!data.length) {
      const remote = await fetchGovNewsFromPython(req.query.sortOrder);
      data = remote?.data?.news_on_air || [];
    }

    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get PIB Ministry
export const getPibMinistry = async (req, res) => {
  try {
    let data = await readTableRows(TABLES.pib_ministry, req.query.sortOrder);

    if (!data.length) {
      const remote = await fetchGovNewsFromPython(req.query.sortOrder);
      data = remote?.data?.pib_ministry || [];
    }

    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get PIB News
export const getPibNews = async (req, res) => {
  try {
    let data = await readTableRows(TABLES.pib_news, req.query.sortOrder);

    if (!data.length) {
      const remote = await fetchGovNewsFromPython(req.query.sortOrder);
      data = remote?.data?.pib_news || [];
    }

    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Get DD News
export const getDdNews = async (req, res) => {
  try {
    let data = await readTableRows(TABLES.dd_news, req.query.sortOrder);

    if (!data.length) {
      const remote = await fetchGovNewsFromPython(req.query.sortOrder);
      data = remote?.data?.dd_news || [];
    }

    res.json({ status: "success", count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟣 Get all news (merged)
export const getAllNews = async (req, res) => {
  try {
    const localResponse = await buildLocalGovNewsResponse(req.query.sortOrder);

    try {
      const liveResponse = await fetchGovNewsLive();
      if (hasAnyGovNewsRows(liveResponse)) {
        return res.json(liveResponse);
      }
    } catch (liveError) {
      // Fall through to the Python proxy fallback.
    }

    try {
      const remoteResponse = await fetchGovNewsFromPython(req.query.sortOrder);
      if (hasAnyGovNewsRows(remoteResponse)) {
        return res.json(remoteResponse);
      }
    } catch (remoteError) {
      // Fall through to the empty local response.
    }

    return res.json(localResponse);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟡 Get by table name (dynamic) → /news/table/news_on_air
export const getNewsByTable = async (req, res) => {
  try {
    const { table } = req.params;
    const allowed = Object.keys(TABLES);

    if (!allowed.includes(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }

    let data = await readTableRows(TABLES[table], req.query.sortOrder);

    if (!data.length) {
      const remote = await fetchGovNewsFromPython(req.query.sortOrder);
      data = remote?.data?.[table] || [];
    }

    res.json({ status: "success", count: data.length, data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
