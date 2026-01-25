import React, { useState } from 'react';

// Define TypeScript interfaces
interface NewsOnAirItem {
  id: number;
  title: string;
  body: string;
  image?: string;
  news_category: string;
  updatedAt: string;
  url: string;
}

interface PIBNewsItem {
  id: number;
  title: string;
  ministry_title: string;
  source: string;
  createdAt: string;
  url: string;
}

interface PIBMinistryItem {
  id: number;
  ministry_id: string;
  title: string;
}

interface DDNewsItem {
  id: number;
  title: string;
  image?: string;
  news_category: string;
  source: string;
  createdAt: string;
  url: string;
}

interface NewsData {
  news_on_air: NewsOnAirItem[];
  pib_news: PIBNewsItem[];
  pib_ministry: PIBMinistryItem[];
  dd_news: DDNewsItem[];
}

interface TotalRecords {
  news_on_air: number;
  pib_news: number;
  pib_ministry: number;
  dd_news: number;
}

interface NewsTableViewData {
  total_records: TotalRecords;
  data: NewsData;
}

interface NewsTableViewProps {
  data: NewsTableViewData;
}

interface ExpandedRows {
  [key: string]: boolean;
}

type TabKey = 'news_on_air' | 'pib_news' | 'pib_ministry' | 'dd_news';

interface Tab {
  key: TabKey;
  label: string;
  count: number;
}

const NewsTableView: React.FC<NewsTableViewProps> = ({ data }) => {
  console.log(data);
  const [activeTab, setActiveTab] = useState<TabKey>('news_on_air');
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});

  console.log('NewsTableView data:', data);
  // Toggle row expansion
  const toggleRowExpansion = (section: TabKey, id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [`${section}_${id}`]: !prev[`${section}_${id}`]
    }));
  };

  // Format date function
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Truncate text function
  const truncateText = (text: string, length: number = 100): string => {
    if (!text) return 'No content available';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  // Tab configuration
  const tabs: Tab[] = [
    { 
      key: 'news_on_air', 
      label: 'News on Air', 
      count: data?.total_records?.news_on_air || 0 
    },
    { 
      key: 'pib_news', 
      label: 'PIB News', 
      count: data?.total_records?.pib_news || 0 
    },
    { 
      key: 'pib_ministry', 
      label: 'PIB Ministry', 
      count: data?.total_records?.pib_ministry || 0 
    },
    { 
      key: 'dd_news', 
      label: 'DD News', 
      count: data?.total_records?.dd_news || 0 
    },
  ];

  // Safe data access
  const getSectionData = (): any[] => {
    if (!data?.data) return [];
    return data.data[activeTab] || [];
  };

  // News on Air Table
  const renderNewsOnAirTable = (newsData: NewsOnAirItem[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title & Image</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {newsData.map((news) => {
            const rowKey = `news_on_air_${news.id}`;
            const isExpanded = expandedRows[rowKey] || false;
            
            return (
              <React.Fragment key={news.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      {news.image && (
                        <img 
                          src={news.image} 
                          alt={news.title}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{news.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {isExpanded ? news.body : truncateText(news.body, 150)}
                        </p>
                        <button
                          onClick={() => toggleRowExpansion('news_on_air', news.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                        >
                          {isExpanded ? 'Show Less' : 'Read More'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {news.news_category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(news.updatedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </a>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // PIB News Table
  const renderPibNewsTable = (newsData: PIBNewsItem[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ministry</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {newsData.map((news) => (
            <tr key={news.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-900">{news.title}</h3>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{news.ministry_title}</span>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {news.source}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(news.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm">
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 font-medium"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // PIB Ministry Table
  const renderPibMinistryTable = (ministryData: PIBMinistryItem[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ministry Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ministryData.map((ministry) => (
            <tr key={ministry.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {ministry.ministry_id}
              </td>
              <td className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-900">{ministry.title}</h3>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Ministry
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // DD News Table
  const renderDDNewsTable = (newsData: DDNewsItem[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title & Image</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {newsData.map((news) => (
            <tr key={news.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  {news.image && (
                    <img 
                      src={news.image} 
                      alt={news.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{news.title}</h3>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {news.news_category}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{news.source}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(news.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm">
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 font-medium"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render table based on active tab
  const renderTable = () => {
    const sectionData = getSectionData();
    
    if (sectionData.length === 0) {
      return null;
    }

    switch (activeTab) {
      case 'news_on_air':
        return renderNewsOnAirTable(sectionData as NewsOnAirItem[]);
      case 'pib_news':
        return renderPibNewsTable(sectionData as PIBNewsItem[]);
      case 'pib_ministry':
        return renderPibMinistryTable(sectionData as PIBMinistryItem[]);
      case 'dd_news':
        return renderDDNewsTable(sectionData as DDNewsItem[]);
      default:
        return null;
    }
  };

  // Check if data is available
  if (!data || !data.total_records || !data.data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📰</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-500">Unable to load news data.</p>
        </div>
      </div>
    );
  }

  const sectionData = getSectionData();
  const hasData = sectionData.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">News Dashboard</h1>
        <p className="text-gray-600 mt-2">Total records across all sources</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tabs.map(tab => (
          <div 
            key={tab.key}
            className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
              activeTab === tab.key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <h3 className="font-semibold text-gray-700">{tab.label}</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">{tab.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Table */}
      {hasData ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {renderTable()}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📰</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No news available</h3>
          <p className="text-gray-500">There are no news items in this category.</p>
        </div>
      )}
    </div>
  );
};

export default NewsTableView;