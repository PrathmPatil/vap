export default function handler(req, res) {
  const { symbol } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, replace with actual database queries to get company info
    // This would typically involve joining multiple tables and calculating metrics

    const getCompanyName = (symbol) => {
      const companies = {
        'RELIANCE': 'Reliance Industries Limited',
        'TCS': 'Tata Consultancy Services Limited',
        'HDFCBANK': 'HDFC Bank Limited',
        'INFY': 'Infosys Limited',
        'ICICIBANK': 'ICICI Bank Limited',
        'HINDUNILVR': 'Hindustan Unilever Limited',
        'ITC': 'ITC Limited',
        'SBIN': 'State Bank of India',
        'BHARTIARTL': 'Bharti Airtel Limited',
        'KOTAKBANK': 'Kotak Mahindra Bank Limited',
        'HBLENGINE': 'HBL Power Systems Limited'
      };
      return companies[symbol.toUpperCase()] || `${symbol.toUpperCase()} Limited`;
    };

    const getSector = (symbol) => {
      const sectors = {
        'RELIANCE': 'Oil & Gas',
        'TCS': 'Information Technology',
        'HDFCBANK': 'Financial Services',
        'INFY': 'Information Technology',
        'ICICIBANK': 'Financial Services',
        'HINDUNILVR': 'Consumer Goods',
        'ITC': 'Consumer Goods',
        'SBIN': 'Financial Services',
        'BHARTIARTL': 'Telecommunications',
        'KOTAKBANK': 'Financial Services',
        'HBLENGINE': 'Power'
      };
      return sectors[symbol.toUpperCase()] || 'Diversified';
    };

    const getIndustry = (symbol) => {
      const industries = {
        'RELIANCE': 'Refineries',
        'TCS': 'Software',
        'HDFCBANK': 'Banks',
        'INFY': 'Software',
        'ICICIBANK': 'Banks',
        'HINDUNILVR': 'FMCG',
        'ITC': 'Tobacco & FMCG',
        'SBIN': 'Banks',
        'BHARTIARTL': 'Telecom Services',
        'KOTAKBANK': 'Banks',
        'HBLENGINE': 'Power Equipment'
      };
      return industries[symbol.toUpperCase()] || 'Conglomerate';
    };

    // Mock company basic info
    const mockCompanyInfo = {
      symbol: symbol.toUpperCase(),
      name: getCompanyName(symbol),
      sector: getSector(symbol),
      industry: getIndustry(symbol),
      marketCap: '₹1,67,085 Cr',
      currentPrice: '₹2,470.00',
      bookValue: '₹1,372.80',
      faceValue: '₹10.00',
      dividendYield: '0.5%',
      peRatio: '15.2',
      pbRatio: '1.8',
      roe: '12.5%',
      eps: '₹162.50'
    };

    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: mockCompanyInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company basic info',
      message: error.message
    });
  }
}