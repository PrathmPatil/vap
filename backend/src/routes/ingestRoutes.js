import express from 'express';
import { nseModel } from '../models/index.js';
import { getPaginatedNseData } from '../services/ingestService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const q = req.query.q || null;
    const sort_by = req.query.sort_by || "id";
    const sort_order = req.query.sort_order || "desc";

    const result = await getPaginatedNseData(
      nseModel,     // MODEL
      { page, limit, q, sort_by, sort_order } // PARAMS
    );

    res.json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error('Pagination Error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

export default router;
