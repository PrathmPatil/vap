
import express from 'express';
import CompanyFinancials from '../models/screener/companyFinancials.js';
import { screenerDataController } from '../controllers/screenerController.js';
const router = express.Router();

// Get all financial records
router.get('/', async (req, res) => {
  try {
    const data = await CompanyFinancials.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new record
router.post('/', async (req, res) => {
  try {
    const { company, revenue, profit } = req.body;
    const newRecord = await CompanyFinancials.create({ company, revenue, profit });
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// screener_data
router.get('/screener_data/:symbol',screenerDataController);
// write welcome route
router.get('/welcome', (req, res) => {
  res.send('📂 Welcome to the Screener Data API.');
});
export default router;
