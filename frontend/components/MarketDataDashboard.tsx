import { getFinnhubData } from '@/utils';
import React, { useState, useEffect } from 'react';

// ==================== TYPES ====================
interface MarketStatus {
  id: number;
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string | null;
  t: number | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

interface MarketHoliday {
  id: number;
  eventName: string;
  atDate: string;
  tradingHour: string | null;
  postMarket: string | null;
  created_at: string;
  updated_at: string;
}

interface IPOCalendar {
  id: number;
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number | null;
  price: string | null;
  status: string;
  symbol: string;
  totalSharesValue: number | null;
  created_at: string;
  updated_at: string;
}

interface EarningsCalendar {
  id: number;
  date: string;
  epsActual: string | null;
  epsEstimate: number | null;
  hour: string | null;
  quarter: number | null;
  revenueActual: string | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

type TableType = 'market-status' | 'market-holiday' | 'ipo-calendar' | 'earnings-calendar';

// ==================== MAIN COMPONENT ====================
const MarketDataDashboard: React.FC = () => {
  // State for selected table
  const [selectedTable, setSelectedTable] = useState<TableType>('market-status');
  
  // State for all data types
  const [marketStatusData, setMarketStatusData] = useState<MarketStatus[]>([]);
  const [marketHolidayData, setMarketHolidayData] = useState<MarketHoliday[]>([]);
  const [ipoData, setIpoData] = useState<IPOCalendar[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsCalendar[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data based on selected table
  useEffect(() => {
    fetchData();
  }, [selectedTable, currentPage, itemsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      switch (selectedTable) {
        case 'market-status':
          endpoint = 'market_status';
          break;
        case 'market-holiday':
          endpoint = 'market_holiday';
          break;
        case 'ipo-calendar':
          endpoint = 'ipo_calendar';
          break;
        case 'earnings-calendar':
          endpoint = 'earnings_calendar';
          break;
      }
      

     const response = await getFinnhubData(endpoint, {page: currentPage, limit: itemsPerPage});
      const {success, data, pagination, message} = response;
      if (!success) {
        throw new Error(`HTTP error! status: ${message || 'Unknown error'}`);
      }
      
      
      // Update the appropriate state based on selected table
      switch (selectedTable) {
        case 'market-status':
          setMarketStatusData(data as MarketStatus[] || []);
          break;
        case 'market-holiday':
          setMarketHolidayData(data as MarketHoliday[] || []);
          break;
        case 'ipo-calendar':
          setIpoData(data as IPOCalendar[] || []);
          break;
        case 'earnings-calendar':
          setEarningsData(data as EarningsCalendar[] || []);
          break;
      }
      
      // Update pagination info
      setTotalPages(pagination?.pages || 0);
      setTotalItems(pagination?.total || 0);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value as string;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return '-';
    return value.toLocaleString();
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const changeItemsPerPage = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  // Get current data based on selected table
  const getCurrentData = () => {
    switch (selectedTable) {
      case 'market-status':
        return marketStatusData;
      case 'market-holiday':
        return marketHolidayData;
      case 'ipo-calendar':
        return ipoData;
      case 'earnings-calendar':
        return earningsData;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();

  // ==================== RENDER FUNCTIONS FOR EACH TABLE ====================

  const renderMarketStatusTable = () => (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exchange</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timezone</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(currentData as MarketStatus[]).map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{item.id}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{item.exchange}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.holiday || '-'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  item.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.isOpen ? 'Open' : 'Closed'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.session || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.timezone || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  const renderMarketHolidayTable = () => (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trading Hours</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Post Market</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(currentData as MarketHoliday[]).map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{item.id}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.eventName}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.atDate)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.tradingHour || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.postMarket || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  const renderIPOTable = () => (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exchange</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(currentData as IPOCalendar[]).map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{item.id}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{item.exchange}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{item.symbol}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatNumber(item.numberOfShares)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.price || '-'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'priced' ? 'bg-green-100 text-green-800' :
                  item.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  const renderEarningsTable = () => (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quarter</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EPS Actual</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EPS Estimate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue Actual</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(currentData as EarningsCalendar[]).map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{item.id}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.symbol}</td>
              <td className="px-4 py-3 text-sm text-gray-900">Q{item.quarter}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{item.year}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.epsActual)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(item.epsEstimate)}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.revenueActual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  // Render the appropriate table based on selection
  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="ml-auto bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (currentData.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    switch (selectedTable) {
      case 'market-status':
        return renderMarketStatusTable();
      case 'market-holiday':
        return renderMarketHolidayTable();
      case 'ipo-calendar':
        return renderIPOTable();
      case 'earnings-calendar':
        return renderEarningsTable();
      default:
        return null;
    }
  };

  // Pagination component
  const renderPagination = () => {
    if (currentData.length === 0) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{' '}
              of <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={itemsPerPage}
              onChange={(e) => changeItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md text-sm px-2 py-1"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => goToPage(number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === number
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Market Data Dashboard</h1>
          
          {/* Table Selector */}
          <div className="flex flex-wrap gap-2">
            {(['market-status', 'market-holiday', 'ipo-calendar', 'earnings-calendar'] as TableType[]).map((table) => (
              <button
                key={table}
                onClick={() => {
                  setSelectedTable(table);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTable === table
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {table.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedTable.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h2>
            
            {renderTable()}
            {renderPagination()}
          </div>
        </div>
    </div>
  );
};

export default MarketDataDashboard;