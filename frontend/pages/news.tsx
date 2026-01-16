"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Navigation from "@/components/Navigation";
import NewsTableView from "@/components/news/NewsTableView";
import NewsComponent from "@/components/news/NewsComponent";
import { getBseAnnouncements } from "@/utils";

/* -------------------- TYPES -------------------- */

interface BseNewsItem {
  id: number;
  DT_TM: string;
  HEADLINE: string;
  NEWSSUB: string;
  CATEGORYNAME: string;
  SUBCATNAME: string;
  SLONGNAME: string;
  NSURL: string;
  MORE?: string;
  [key: string]: any;
}

interface NewsTableViewData {
  total_records: {
    news_on_air: number;
    pib_news: number;
    pib_ministry: number;
    dd_news: number;
  };
  data: {
    news_on_air: any[];
    pib_news: any[];
    pib_ministry: any[];
    dd_news: Array<{
      id: number;
      title: string;
      body: string;
      image?: string;
      news_category: string;
      source: string;
      createdAt: string;
      url: string;
    }>;
  };
}

/* -------------------- COMPONENT -------------------- */

export default function News() {
  const [newsTableViewData, setNewsTableViewData] =
    useState<NewsTableViewData | null>(null);

  const [activeTab, setActiveTab] = useState<"Announcements" | "News">(
    "Announcements"
  );

  const [newsSource, setNewsSource] = useState<"ALL" | "BSE">("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  /* -------------------- FETCH DATA -------------------- */

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchNewsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: any = await getBseAnnouncements(
          "",
          1,
          50,
          "DT_TM",
          "DESC"
        );

        if (response?.success && Array.isArray(response.data)) {
          const transformed: NewsTableViewData = {
            total_records: {
              news_on_air: 0,
              pib_news: 0,
              pib_ministry: 0,
              dd_news: response.data.length
            },
            data: {
              news_on_air: [],
              pib_news: [],
              pib_ministry: [],
              dd_news: response.data.map((item: BseNewsItem, index: number) => ({
                id: item.id || index + 1,
                title: item.HEADLINE || item.NEWSSUB || "No title",
                body: item.MORE || item.HEADLINE || "",
                image: "",
                news_category:
                  item.CATEGORYNAME || item.SUBCATNAME || "Announcement",
                source: item.SLONGNAME || "BSE",
                createdAt: item.DT_TM,
                url: item.NSURL || "#"
              }))
            }
          };

          setNewsTableViewData(transformed);
        } else {
          setError("Invalid response from BSE API");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch news");
      } finally {
        setLoading(false);
      }
    };

    fetchNewsData();
  }, []);

  /* -------------------- FILTER DATA -------------------- */

  const filteredNewsData = useMemo(() => {
    if (!newsTableViewData) return null;

    if (newsSource === "BSE") {
      return {
        ...newsTableViewData,
        data: {
          ...newsTableViewData.data,
          dd_news: newsTableViewData.data.dd_news.filter(item =>
            item.source?.toUpperCase().includes("BSE")
          )
        }
      };
    }

    return newsTableViewData;
  }, [newsTableViewData, newsSource]);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Top Tabs */}
        <div className="flex justify-end gap-2 mb-6">
          {["Announcements", "News"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* News Filters */}
        {activeTab === "News" && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setNewsSource("ALL")}
              className={`px-3 py-1 rounded ${
                newsSource === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setNewsSource("BSE")}
              className={`px-3 py-1 rounded ${
                newsSource === "BSE"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              BSE
            </button>
          </div>
        )}

        {/* States */}
        {loading && <p className="text-center">Loading...</p>}

        {error && (
          <p className="text-center text-red-600 font-medium">{error}</p>
        )}

        {/* Content */}
        {!loading && activeTab === "News" && filteredNewsData && (
          <NewsTableView data={filteredNewsData} />
        )}

        {!loading && activeTab === "Announcements" && <NewsComponent />}
      </main>
    </div>
  );
}
