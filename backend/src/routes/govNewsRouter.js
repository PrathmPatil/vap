// routes/news.routes.js
import express from "express";
import {
  getNewsOnAir,
  getPibMinistry,
  getPibNews,
  getDdNews,
  getAllNews,
  getNewsByTable,
} from "../controllers/govNewsController.js";

const router = express.Router();

// Individual sources
router.get("/news-on-air", getNewsOnAir);
router.get("/pib-ministry", getPibMinistry);
router.get("/pib-news", getPibNews);
router.get("/dd-news", getDdNews);

// All news in single response
router.get("/all", getAllNews);

// Dynamic table access
router.get("/table/:table", getNewsByTable);

export default router;
