export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM balance_sheet_balance_sheet WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      symbol: symbol.toUpperCase(),
      col_unknown: `Balance Sheet Item ${i + 1}`,
      Mar_2024: (Math.random() * 10000).toFixed(2),
      Mar_2023: (Math.random() * 9000).toFixed(2),
      Mar_2022: (Math.random() * 8000).toFixed(2),
      Mar_2021: (Math.random() * 7000).toFixed(2),
      Mar_2020: (Math.random() * 6000).toFixed(2),
      Dec_2023: (Math.random() * 8500).toFixed(2),
      Dec_2022: (Math.random() * 7500).toFixed(2),
      Jun_2024: (Math.random() * 9500).toFixed(2),
      Jun_2023: (Math.random() * 8500).toFixed(2),
      Sep_2024: (Math.random() * 9800).toFixed(2)
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
      error: 'Failed to fetch balance sheet data',
      message: error.message
    });
  }
}