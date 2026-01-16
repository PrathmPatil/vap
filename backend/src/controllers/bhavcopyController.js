import {
  BC, BH, Corpbond, ETF, FFIX, GL, HL, IX, MCAP, PD, PR
} from '../models/index.js';
import { getPaginatedData } from '../services/bhavcopyService.js';

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const welcome = (req, res) => {
  res.send('📂 Welcome to the Corporate Events Ingestion API.');
};

export const getBC       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(BC, req.query)) }));
export const getBH       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(BH, req.query)) }));
export const getCorpbond = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(Corpbond, req.query)) }));
export const getETF      = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(ETF, req.query)) }));
export const getFFIX     = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(FFIX, req.query)) }));
export const getGL       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(GL, req.query)) }));
export const getHL       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(HL, req.query)) }));
export const getIX       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(IX, req.query)) }));
export const getMCAP     = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(MCAP, req.query)) }));
export const getPD       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(PD, req.query)) }));
export const getPR       = asyncHandler(async (req, res) => res.status(200).json({ success: true, ...(await getPaginatedData(PR, req.query)) }));
