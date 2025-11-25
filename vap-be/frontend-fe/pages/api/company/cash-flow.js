export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM cash_flow_cash_flow WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 30 }, (_, i) => ({
      symbol: symbol.toUpperCase(),
      col_unknown: `Cash Flow Item ${i + 1}`,
      Mar_2024: (Math.random() * 5000).toFixed(2),
      Mar_2023: (Math.random() * 4500).toFixed(2),
      Mar_2022: (Math.random() * 4000).toFixed(2),
      Mar_2021: (Math.random() * 3500).toFixed(2),
      Mar_2020: (Math.random() * 3000).toFixed(2),
      Dec_2023: (Math.random() * 4200).toFixed(2),
      Dec_2022: (Math.random() * 3800).toFixed(2),
      Jun_2024: (Math.random() * 4800).toFixed(2),
      Jun_2023: (Math.random() * 4300).toFixed(2)
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
      error: 'Failed to fetch cash flow data',
      message: error.message
    });
  }
}