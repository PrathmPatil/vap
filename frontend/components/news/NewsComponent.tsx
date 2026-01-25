"use client";
import { debounce } from "@/hooks/common";
import { getBseAnnouncements, getGovNews } from "@/utils";
import React, { useState, useEffect, useCallback, useRef, use } from "react";

export interface BseNewsItem {
  SCRIP_CD: string;
  SLONGNAME: string;
  HEADLINE: string;
  NEWSSUB: string;
  CRITICALNEWS: "0" | "1";
  DissemDT: string;
  NSURL: string;
  ATTACHMENTNAME?: string;
}

export interface BseNewsResponse {
  success: boolean;
  data: BseNewsItem[];
  page: number;
  pages: number;
  total: number;
}

const NewsComponent = () => {
  const [newsData, setNewsData] = useState<BseNewsItem[]>([]);
  const [govNewsData, setGovNewsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState({ news_on_air: 0, pib_news: 0, pib_ministry: 0, dd_news: 0 });

  const observerRef = useRef<HTMLDivElement | null>(null);

  // ------------------------------
  // Debounced Search
  // ------------------------------
  const handleSearch = debounce((value: string) => {
    setSearchTerm(value);
    setPage(1); // reset page
    setNewsData([]); // clear old results
  }, 800);

  // ------------------------------
  // Fetch API
  // ------------------------------
  const fetchNewsData = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await getBseAnnouncements(
        searchTerm,
        page,
        20,
        "DT_TM",
        "DESC"
      );

      if (response.success) {
        if (page === 1) {
          setNewsData(response.data);
          // setTotalRecords(response.total_records);
        } else {
          setNewsData((prev) => [...prev, ...response.data]);
        }

        setTotalPages(response.pages);
        setError(null);
      } else {
        setError("Failed to fetch news data");
      }
    } catch (err: any) {
      setError("Error fetching news data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  // getGovNews 
  //   search = '',
  // page = 1,
  // limit = 20,
  // sortField = 'DT_TM',
  // sortOrder: string = 'DESC'
  const fetchGovNewsData = useCallback(async () => {
    try {
      const response = await getGovNews(
        searchTerm,
        page,
        20,
        "DT_TM",
        "DESC"
      );

      if (response.status === "success") {
        if (page === 1) {
          setGovNewsData(response.data);
          setTotalRecords(response.total_records);
        } else {
          setGovNewsData((prev) => [...prev, ...response.data]);
          setTotalRecords(response.total_records);
        }

        setTotalPages(response.pages);
        setError(null); 
      } else {
        setError("Failed to fetch government news data");
      }
    } catch (err: any) {
      setError("Error fetching government news data: " + err.message);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    fetchNewsData();
    fetchGovNewsData();
  }, [fetchNewsData, fetchGovNewsData]);

  // ------------------------------
  // Infinite Scroll Observer
  // ------------------------------
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [loading, page, totalPages]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 sticky top-16 bg-gradient-to-br from-slate-50 to-slate-100 py-4 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Latest News</h1>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search news..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {console.log(newsData, loading)}
      {!loading && newsData.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No news found
        </div>
      )}

      {/* News Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {newsData.map((news, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border"
          >
            <div className="p-4 border-b">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  {news.SCRIP_CD}
                </span>

                {news.CRITICALNEWS === "1" && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    Critical
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold line-clamp-2">
                {news.HEADLINE}
              </h3>
            </div>

            <div className="p-4">
              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                {news.NEWSSUB}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Company:</span>
                  <span className="font-medium">{news.SLONGNAME}</span>
                </div>

                <div className="flex justify-between">
                  <span>Published:</span>
                  <span className="font-medium">
                    {formatDate(news.DissemDT)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <a
                href={news.NSURL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Read More →
              </a>

              {news.ATTACHMENTNAME && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  PDF Available
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={observerRef} className="h-10"></div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default NewsComponent;
