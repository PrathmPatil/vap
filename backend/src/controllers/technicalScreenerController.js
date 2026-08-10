import { getTechnicalScreenerPage } from '../services/technicalScreenerService.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const getTechnicalScreener = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    sortField = 'volume',
    sortOrder = 'DESC',
    rsiMin,
    rsiMax,
    obvMin,
    priceMin,
    priceMax,
    volumeMin,
    bbPosition,
    maTrend,
    onlyPositiveChange,
  } = req.query;

  const result = await getTechnicalScreenerPage({
    page,
    limit,
    search,
    sortField,
    sortOrder,
    filters: {
      rsiMin: rsiMin !== undefined && rsiMin !== '' ? Number(rsiMin) : null,
      rsiMax: rsiMax !== undefined && rsiMax !== '' ? Number(rsiMax) : null,
      obvMin: obvMin !== undefined && obvMin !== '' ? Number(obvMin) : null,
      priceMin: priceMin !== undefined && priceMin !== '' ? Number(priceMin) : null,
      priceMax: priceMax !== undefined && priceMax !== '' ? Number(priceMax) : null,
      volumeMin: volumeMin !== undefined && volumeMin !== '' ? Number(volumeMin) : null,
      bbPosition: bbPosition || null,
      maTrend: maTrend || null,
      onlyPositiveChange:
        onlyPositiveChange === 'true' || onlyPositiveChange === '1' || onlyPositiveChange === true,
    },
  });

  res.json(result);
});
