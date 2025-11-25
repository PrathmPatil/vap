export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM shareholding_pattern_shareholding_pattern WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 15 }, (_, i) => ({
      symbol: symbol.toUpperCase(),
      col_unknown: `Shareholding Category ${i + 1}`,
      Mar_2024: (Math.random() * 100).toFixed(2),
      Mar_2023: (Math.random() * 100).toFixed(2),
      Mar_2022: (Math.random() * 100).toFixed(2),
      Mar_2021: (Math.random() * 100).toFixed(2),
      Jun_2024: (Math.random() * 100).toFixed(2),
      Jun_2023: (Math.random() * 100).toFixed(2),
      Aug_2024: (Math.random() * 100).toFixed(2),
      Jul_2024: (Math.random() * 100).toFixed(2)
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
      error: 'Failed to fetch shareholding pattern data',
      message: error.message
    });
  }
}