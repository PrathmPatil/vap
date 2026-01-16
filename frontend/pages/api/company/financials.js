export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM company_financials WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      symbol: symbol.toUpperCase(),
      metric: `Financial Metric ${i + 1}`,
      year: `FY${24 - (i % 5)}`,
      value: (Math.random() * 10000).toFixed(2)
    }));

    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: mockData,
      total: mockData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financials data',
      message: error.message
    });
  }
}