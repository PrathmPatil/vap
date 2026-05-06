import express from 'express';
import {
  getAllCompanies,
  getCompaniesData,
  getCompanyBySymbol,
  getFailedSymbols,
  getListedCompanies
} from '../controllers/stockdatacontroller.js';
import { getAnalyzeCompaniesData } from '../controllers/companiesController.js';
import { getListedDaily } from '../controllers/companyDailyController.js';
import { addToWatchlist, removeFromWatchlist, getUserWatchlist } from '../controllers/watchlistController.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/all-companies', getAllCompanies);
router.get('/companies-data', getCompaniesData);
router.get('/failed-symbols', getFailedSymbols);
router.get('/listed-companies', getListedCompanies);

router.get('/listed-daily', getListedDaily);
router.post('/watchlist', authenticate, addToWatchlist);
router.get('/watchlist', authenticate, getUserWatchlist);
router.delete('/watchlist/:symbol', authenticate, removeFromWatchlist);

router.post("/formula/all-companies", getAnalyzeCompaniesData);
router.get('/:symbol', getCompanyBySymbol);

export default router;
