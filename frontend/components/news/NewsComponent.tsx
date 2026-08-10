"use client";
import { debounce } from "@/hooks/common";
import { getBseAnnouncements } from "@/utils";
import React, { useState, useEffect, useCallback, useRef } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

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

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Strip company/id prefixes that already appear as card fields.
  const cleanNewsSub = (news: BseNewsItem) => {
    let text = String(news.NEWSSUB || "").trim();
    const company = String(news.SLONGNAME || "").trim();
    const code = String(news.SCRIP_CD || "").trim();
    const headline = String(news.HEADLINE || "").trim();

    if (company) {
      const companyRe = escapeRegExp(company);
      const codeRe = code ? escapeRegExp(code) : "";
      const patterns = [
        codeRe
          ? new RegExp(`^${companyRe}\\s*-\\s*${codeRe}\\s*[-:]\\s*`, "i")
          : null,
        new RegExp(`^${companyRe}\\s*-\\s*`, "i"),
        codeRe ? new RegExp(`^${codeRe}\\s*-\\s*`, "i") : null,
      ].filter(Boolean) as RegExp[];

      for (const pattern of patterns) {
        text = text.replace(pattern, "");
      }
    }

    text = text.trim();
    if (!text || text.toLowerCase() === headline.toLowerCase()) return "";
    return text;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 sticky top-16 bg-slate-50 py-4 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Latest News</h1>
        </div>

        {/* Search */}
        <div className="mb-2">
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

      {!loading && newsData.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No news found
        </div>
      )}

      {/* News Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {newsData.map((news, index) => {
          const summary = cleanNewsSub(news);

          return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border"
          >
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-semibold line-clamp-2">
                  {news.HEADLINE}
                </h3>

                {news.CRITICALNEWS === "1" && (
                  <span className="shrink-0 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    Critical
                  </span>
                )}
              </div>
            </div>

            <div className="p-4">
              {summary ? (
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {summary}
                </p>
              ) : null}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span>Company:</span>
                  <span className="font-medium text-right">{news.SLONGNAME}</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Published:</span>
                  <span className="font-medium text-right">
                    {formatDate(news.DissemDT)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <a
                href={news.NSURL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Read More →
              </a>
            </div>
          </div>
          );
        })}
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
