
import { AllCompaniesData, CompaniesData, FailedSymbols, ListedCompanies } from '../models/index.js';
import { getPaginatedData, getPaginatedDataBySymbol } from '../services/stockdataservices.js';

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const getAllCompanies = asyncHandler(async (req, res) => {
  const result = await getPaginatedData(AllCompaniesData, req.query,"date");
  res.status(200).json({ success: true, ...result });
});

export const getCompaniesData = asyncHandler(async (req, res) => {
  const result = await getPaginatedData(CompaniesData, req.query,"date");
  res.status(200).json({ success: true, ...result });
});

export const getFailedSymbols = asyncHandler(async (req, res) => {
  const result = await getPaginatedData(FailedSymbols, req.query,"created_at");
  res.status(200).json({ success: true, ...result });
});

export const getListedCompanies = asyncHandler(async (req, res) => {
  const result = await getPaginatedData(ListedCompanies, req.query,"date_of_listing");
  res.status(200).json({ success: true, ...result });
});
 

export const getCompanyBySymbol = asyncHandler(async (req, res) => {
  const result = await getPaginatedDataBySymbol(AllCompaniesData, req, "date");
  res.status(result.success ? 200 : 404).json(result);
});
