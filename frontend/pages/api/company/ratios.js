export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database query
    // const query = `SELECT * FROM other_data_ratios WHERE symbol = ?`;
    // const results = await db.query(query, [symbol.toUpperCase()]);

    // Mock data for demonstration
    const mockData = Array.from({ length: 25 }, (_, i) => ({
      symbol: symbol.toUpperCase(),
      col_unknown: `Financial Ratio ${i + 1}`,
      Mar_2024: (Math.random() * 50).toFixed(2),
      Mar_2023: (Math.random() * 45).toFixed(2),
      Mar_2022: (Math.random() * 40).toFixed(2),
      Mar_2021: (Math.random() * 35).toFixed(2),
      Mar_2020: (Math.random() * 30).toFixed(2),
      Dec_2023: (Math.random() * 42).toFixed(2),
      Dec_2022: (Math.random() * 38).toFixed(2),
      Jun_2024: (Math.random() * 48).toFixed(2),
      Jun_2023: (Math.random() * 43).toFixed(2)
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
      error: 'Failed to fetch ratios data',
      message: error.message
    });
  }
}