import axios from 'axios';
import logger from '../config/logger.js';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8080';

const pythonClient = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000
});

export const syncMarketHolidaysFromPython = async () => {
  const response = await pythonClient.post('/indian-market/sync-holidays');
  return response.data;
};

export const syncIpoDataFromPython = async () => {
  const response = await pythonClient.get('/ipo-scraper/fetch/nse');
  return response.data;
};

export const bootstrapReferenceData = async () => {
  const results = {};

  try {
    results.holidays = await syncMarketHolidaysFromPython();
    logger.info('✅ Market holidays sync completed');
  } catch (error) {
    logger.warn(`⚠️ Market holidays sync failed: ${error.message}`);
    results.holidays = { success: false, message: error.message };
  }

  try {
    results.ipo = await syncIpoDataFromPython();
    logger.info('✅ IPO sync completed');
  } catch (error) {
    logger.warn(`⚠️ IPO sync failed: ${error.message}`);
    results.ipo = { success: false, message: error.message };
  }

  return results;
};
