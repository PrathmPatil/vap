"use client";

import { useEffect, useState, useRef } from "react";
import Navigation from "@/components/Navigation";
import NewsTableView from "@/components/news/NewsTableView";
import NewsComponent from "@/components/news/NewsComponent";
import { getGovNews } from "@/utils";
import { PageLoader } from "@/components/ui/PageLoader";

/* -------------------- TYPES -------------------- */

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  /* -------------------- FETCH DATA -------------------- */

  useEffect(() => {
    // if (hasFetched.current) return;
    // hasFetched.current = true;

    const fetchNewsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: any = await getGovNews(
          "",
          1,
          50,
          "DT_TM",
          "DESC"
        );
        if (response.status === "success") {
          const transformed: NewsTableViewData = {
            total_records: {
              news_on_air: response.total_records.news_on_air,
              pib_news: response.total_records.pib_news,
              pib_ministry: response.total_records.pib_ministry,
              dd_news: response.total_records.dd_news
            },
            data: {
              news_on_air: response.data.news_on_air || [],
              pib_news: response.data.pib_news || [],
              pib_ministry: response.data.pib_ministry || [],
              dd_news: response.data.dd_news || []

            //   .map((item: BseNewsItem, index: number) => ({
            //     id: item.id || index + 1,
            //     title: item.HEADLINE || item.NEWSSUB || "No title",
            //     body: item.MORE || item.HEADLINE || "",
            //     image: "",
            //     news_category:
            //       item.CATEGORYNAME || item.SUBCATNAME || "Announcement",
            //     source: item.SLONGNAME || "BSE",
            //     createdAt: item.DT_TM,
            //     url: item.NSURL || "#"
            //   }))
            // }
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

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
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

        {/* States */}
        {loading && (
          <PageLoader inline message="Loading news…" />
        )}

        {error && (
          <p className="text-center text-red-600 font-medium">{error}</p>
        )}

        {/* Content */}
        {!loading && activeTab === "News" && newsTableViewData && (
          <NewsTableView data={newsTableViewData} />
        )}

        {!loading && activeTab === "Announcements" && <NewsComponent />}
      </main>
    </div>
  );
}
