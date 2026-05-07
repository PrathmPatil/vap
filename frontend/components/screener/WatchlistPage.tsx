import React, { useEffect, useMemo, useState } from 'react';
import { Star, TrendingDown, TrendingUp, Plus, Trash2, Search, Eye } from 'lucide-react';
import { addToWatchlist, getListedCompaniesData, getUserWatchlist, removeFromWatchlist } from '@/utils';
import { useAuth } from '@/context/AuthContext';

type WatchlistItem = {
  symbol: string;
  name: string;
  sector?: string;
  addedAt?: string;
  latest?: {
    symbol?: string;
    date?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  } | null;
};

type Company = {
  symbol: string;
  name: string;
  series?: string;
  date_of_listing?: string;
};

const WatchlistPage = () => {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const loadWatchlist = async () => {
    if (!isAuthenticated) {
      setWatchlist([]);
      return;
    }

    setLoadingWatchlist(true);
    try {
      const response = await getUserWatchlist();
      setWatchlist(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('watchlist fetch failed', error);
      setWatchlist([]);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const loadCompanies = async (search = '') => {
    setLoadingCompanies(true);
    try {
      const response = await getListedCompaniesData(1, 200, search);
      setAvailableCompanies(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('listed companies fetch failed', error);
      setAvailableCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, [isAuthenticated]);

  useEffect(() => {
    if (showAddModal) {
      loadCompanies(searchQuery);
    }
  }, [showAddModal, searchQuery]);

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      const value = `${item.name || ''} ${item.symbol || ''}`.toLowerCase();
      return value.includes(searchQuery.toLowerCase());
    });
  }, [watchlist, searchQuery]);

  const handleAdd = async (company: Company) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      await addToWatchlist(company.symbol);
      await loadWatchlist();
      setShowAddModal(false);
    } catch (error) {
      console.error('add to watchlist failed', error);
    }
  };

  const handleRemove = async (symbol: string) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      await removeFromWatchlist(symbol);
      await loadWatchlist();
    } catch (error) {
      console.error('remove from watchlist failed', error);
    }
  };

  const formatVolume = (volume?: number | null): string => {
    if (!volume && volume !== 0) return '-';
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(1)}Cr`;
    if (volume >= 1e5) return `${(volume / 1e5).toFixed(1)}L`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  const formatPrice = (value?: number | null): string => {
    if (value === null || value === undefined) return '-';
    return `₹${Number(value).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen">
      <div className="rounded-lg p-6 border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-fit"
            disabled={!isAuthenticated}
          >
            <Plus className="h-5 w-5 mr-2" />
            {isAuthenticated ? 'Add Stock' : 'Login to Add'}
          </button>

          <div className="relative max-w-md w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loadingWatchlist ? (
          <div className="py-10 text-center text-slate-500">Loading watchlist...</div>
        ) : filteredWatchlist.length > 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Close</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWatchlist.map((item) => {
                  const latestClose = item.latest?.close;
                  const latestVolume = item.latest?.volume;
                  const previousClose = item.latest?.open;
                  const change = latestClose !== undefined && previousClose !== undefined ? latestClose - previousClose : 0;
                  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

                  return (
                    <tr key={item.symbol} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-3 fill-current" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.symbol} {item.sector ? `• ${item.sector}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">{formatPrice(latestClose)}</div>
                        <div className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change >= 0 ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                          {previousClose ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{formatVolume(latestVolume)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => console.log('view', item.symbol)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(item.symbol)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No stocks found' : 'Your watchlist is empty'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Add stocks from the listed companies page or use Add Stock.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Stock
              </button>
            )}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Stock to Watchlist</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loadingCompanies ? (
                  <div className="py-10 text-center text-slate-500">Loading companies...</div>
                ) : (
                  availableCompanies
                    .filter((company) => !watchlist.some((item) => item.symbol === company.symbol))
                    .map((company) => (
                      <button
                        key={company.symbol}
                        onClick={() => handleAdd(company)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500">{company.symbol} {company.series ? `• ${company.series}` : ''}</div>
                      </button>
                    ))
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;
