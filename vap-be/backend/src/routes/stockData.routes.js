import express from 'express';
import {
  getAllCompanies,
  getCompaniesData,
  getCompanyBySymbol,
  getFailedSymbols,
  getListedCompanies
} from '../controllers/stockdatacontroller.js';
import { getAnalyzeCompaniesData } from '../controllers/companiesController.js';

const router = express.Router();

router.get('/all-companies', getAllCompanies);
router.get('/companies-data', getCompaniesData);
router.get('/failed-symbols', getFailedSymbols);
router.get('/listed-companies', getListedCompanies);
router.get('/:symbol', getCompanyBySymbol);
router.post("/formula/all-companies", getAnalyzeCompaniesData);

export default router;
