import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, TrendingUp, Clock, Search } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: 'market' | 'company' | 'economy' | 'policy';
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedSymbols?: string[];
}

const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sample news data - replace with actual API call
    const sampleNews: NewsArticle[] = [
      {
        id: '1',
        title: 'Indian Stock Markets Hit New All-Time High Amid Strong Q3 Earnings',
        summary: 'Sensex crosses 75,000 mark for the first time as IT and banking sectors lead the rally with impressive quarterly results.',
        source: 'Economic Times',
        publishedAt: '2024-01-15T10:30:00Z',
        url: '#',
        category: 'market',
        sentiment: 'positive',
        relatedSymbols: ['TCS', 'INFY', 'HDFC']
      },
      {
        id: '2',
        title: 'RBI Maintains Repo Rate at 6.5% in Latest Policy Review',
        summary: 'Reserve Bank of India keeps key interest rates unchanged, citing balanced approach to inflation and growth concerns.',
        source: 'Business Standard',
        publishedAt: '2024-01-15T09:15:00Z',
        url: '#',
        category: 'policy',
        sentiment: 'neutral'
      },
      {
        id: '3',
        title: 'Reliance Industries Reports Strong Q3 Performance',
        summary: 'Oil-to-telecom giant posts 12% YoY growth in net profit, driven by robust performance in retail and digital services.',
        source: 'Mint',
        publishedAt: '2024-01-15T08:45:00Z',
        url: '#',
        category: 'company',
        sentiment: 'positive',
        relatedSymbols: ['RELIANCE']
      },
      {
        id: '4',
        title: 'Foreign Institutional Investors Turn Net Buyers After Three Months',
        summary: 'FIIs invest ₹8,500 crores in Indian equities this month, showing renewed confidence in emerging market prospects.',
        source: 'Financial Express',
        publishedAt: '2024-01-15T07:20:00Z',
        url: '#',
        category: 'market',
        sentiment: 'positive'
      },
      {
        id: '5',
        title: 'IT Sector Faces Headwinds Amid Global Economic Uncertainty',
        summary: 'Major IT companies report cautious outlook for FY25 as clients delay discretionary spending in key markets.',
        source: 'Hindu BusinessLine',
        publishedAt: '2024-01-14T16:30:00Z',
        url: '#',
        category: 'company',
        sentiment: 'negative',
        relatedSymbols: ['TCS', 'INFY', 'WIPRO']
      },
      {
        id: '6',
        title: 'Government Announces New PLI Scheme for Green Energy Sector',
        summary: 'Production Linked Incentive scheme worth ₹25,000 crores launched to boost renewable energy manufacturing.',
        source: 'Times of India',
        publishedAt: '2024-01-14T14:15:00Z',
        url: '#',
        category: 'policy',
        sentiment: 'positive'
      }
    ];

    setTimeout(() => {
      setNews(sampleNews);
      setFilteredNews(sampleNews);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = news;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.source.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNews(filtered);
  }, [news, selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'All News', count: news.length },
    { id: 'market', label: 'Market', count: news.filter(n => n.category === 'market').length },
    { id: 'company', label: 'Company', count: news.filter(n => n.category === 'company').length },
    { id: 'economy', label: 'Economy', count: news.filter(n => n.category === 'economy').length },
    { id: 'policy', label: 'Policy', count: news.filter(n => n.category === 'policy').length }
  ];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'market': return 'bg-blue-100 text-blue-800';
      case 'company': return 'bg-purple-100 text-purple-800';
      case 'economy': return 'bg-green-100 text-green-800';
      case 'policy': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading latest news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Market News</h1>
          <p className="text-gray-600">Stay updated with the latest financial news and market insights</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category.label} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* News Articles */}
        <div className="space-y-6">
          {filteredNews.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                    {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(article.sentiment)}`}>
                    {article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(article.publishedAt)}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                {article.title}
              </h2>

              <p className="text-gray-600 mb-4 leading-relaxed">
                {article.summary}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Source: {article.source}</span>
                  {article.relatedSymbols && article.relatedSymbols.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <div className="flex space-x-1">
                        {article.relatedSymbols.map((symbol) => (
                          <span
                            key={symbol}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded cursor-pointer hover:bg-gray-200"
                          >
                            {symbol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Read more
                  <ExternalLink className="h-4 w-4 ml-1" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No news found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;