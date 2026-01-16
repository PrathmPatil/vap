export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM quarterly_results_quarterly_results WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 40 }, (_, i) => ({
      symbol: symbol.toUpperCase(),
      col_unknown: `Quarterly Metric ${i + 1}`,
      Sep_2024: (Math.random() * 2000).toFixed(2),
      Jun_2024: (Math.random() * 1800).toFixed(2),
      Mar_2024: (Math.random() * 1600).toFixed(2),
      Dec_2023: (Math.random() * 1400).toFixed(2),
      Sep_2023: (Math.random() * 1200).toFixed(2),
      Jun_2023: (Math.random() * 1000).toFixed(2),
      Mar_2023: (Math.random() * 800).toFixed(2),
      Dec_2022: (Math.random() * 1300).toFixed(2),
      Sep_2022: (Math.random() * 1100).toFixed(2),
      Jun_2022: (Math.random() * 900).toFixed(2)
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
      error: 'Failed to fetch quarterly results data',
      message: error.message
    });
  }
}