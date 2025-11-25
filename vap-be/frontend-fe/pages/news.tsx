import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "@/components/Navigation";
import { MarketOverview } from "@/components/MarketOverview";
// import { StockCharts } from "@/components/StockCharts";
import { CompaniesTable } from "@/components/CompaniesTable";
import { FailedSymbols } from "@/components/FailedSymbols";
import NewsTableView from "@/components/news/NewsTableView";
import NewsComponent from "@/components/news/NewsComponent";
import { useEffect, useState } from "react";
import { getGovNews } from "@/utils";

export default function News() {
  const [govNewsData, setGovNewsData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Announcements");
  useEffect(() => {
    const fetchGovNewsData = async () => {
      try {
        const data = await getGovNews();
        console.log("Gov News Data Fetched:", data);
        if (data.status == "success") {
          setGovNewsData(data);
        }
      } catch (error) {
        console.error("Error fetching government news:", error);
      }
    };

    fetchGovNewsData();
  }, []);
  console.log("Gov News Data in Page:", govNewsData);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          {[
            { key: "Announcements", label: "Announcements" },
            { key: "News", label: "News" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
        px-4 py-2 font-medium transition-all duration-300
        border-b-2
        ${
          activeTab === tab.key
            ? "bg-white border-blue-600 text-blue-600 shadow-sm"
            : "bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300"
        }
      `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-8 relative">
          {govNewsData?.data &&
            typeof govNewsData.data === "object" &&
            Object.keys(govNewsData.data).length > 0 &&  activeTab == "News" &&(
              <NewsTableView data={govNewsData} />
            )}
          {activeTab =="Announcements" && <NewsComponent />}
        </div>
      </main>
    </div>
  );
}
