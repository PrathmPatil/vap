import express from 'express';
import {
  welcome,
  getBC,
  getBH,
  getCorpbond,
  getETF,
  getFFIX,
  getGL,
  getHL,
  getIX,
  getMCAP,
  getPD,
  getPR
} from '../controllers/bhavcopyController.js';

const router = express.Router();

router.get('/', welcome);
router.get('/bc', getBC);
router.get('/bh', getBH);
router.get('/corpbond', getCorpbond);
router.get('/etf', getETF);
router.get('/ffix', getFFIX);
router.get('/gl', getGL);
router.get('/hl', getHL);
router.get('/ix', getIX);
router.get('/mcap', getMCAP);
router.get('/pd', getPD);
router.get('/pr', getPR);

export default router;
