// pages/api/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000/vap';

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const endpoints = {
    stocks: [
      'stocks/all-companies',
      'stocks/companies-data',
      'stocks/failed-symbols',
      'stocks/listed-companies',
    ].map((path) => `${baseUrl}/${path}`),

    bhavcopy: [
      'bhavcopy/bc',
      'bhavcopy/bh',
      'bhavcopy/corpbond',
      'bhavcopy/etf',
      'bhavcopy/ffix',
      'bhavcopy/gl',
      'bhavcopy/hl',
      'bhavcopy/ix',
      'bhavcopy/mcap',
      'bhavcopy/pd',
      'bhavcopy/pr',
    ].map((path) => `${baseUrl}/${path}`),
  };

  return res.status(200).json({
    success: true,
    message: 'Welcome to Corporate Events Ingestion API',
    version: '1.0.0',
    endpoints,
  });
}
