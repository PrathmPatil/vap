export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock data for profit loss metrics
    const mockData = [
      {
        id: 1,
        symbol: symbol.toUpperCase(),
        col1: 'Return on Equity',
        col2: ''
      },
      {
        id: 2,
        symbol: symbol.toUpperCase(),
        col1: '10 Years:',
        col2: '41%'
      },
      {
        id: 3,
        symbol: symbol.toUpperCase(),
        col1: '5 Years:',
        col2: '47%'
      },
      {
        id: 4,
        symbol: symbol.toUpperCase(),
        col1: '3 Years:',
        col2: '50%'
      },
      {
        id: 5,
        symbol: symbol.toUpperCase(),
        col1: 'Last Year:',
        col2: '52%'
      },
      {
        id: 6,
        symbol: symbol.toUpperCase(),
        col1: 'Revenue Growth',
        col2: ''
      },
      {
        id: 7,
        symbol: symbol.toUpperCase(),
        col1: '10 Years:',
        col2: '12%'
      },
      {
        id: 8,
        symbol: symbol.toUpperCase(),
        col1: '5 Years:',
        col2: '8%'
      },
      {
        id: 9,
        symbol: symbol.toUpperCase(),
        col1: '3 Years:',
        col2: '6%'
      },
      {
        id: 10,
        symbol: symbol.toUpperCase(),
        col1: 'Last Year:',
        col2: '4%'
      }
    ];

    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: mockData,
      total: mockData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profit loss data',
      message: error.message
    });
  }
}