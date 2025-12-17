import CompanyPage from "@/components/CompanyPage";
import Navigation from "@/components/Navigation";
import CompanyDashboard from "@/components/screener/CompanyDashboard";
import CompanySearch from "@/components/screener/CompanySearch";
import NewsPage from "@/components/screener/NewsPage";
import WatchlistPage from "@/components/screener/WatchlistPage";
import { getYFinanceStocksByType } from "@/utils";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export async function generateStaticParams() {
  // Return an array of company symbols for static generation
  const symbols = [
    "RELIANCE",
    "TCS",
    "HDFCBANK",
    "INFY",
    "ICICIBANK",
    "HINDUNILVR",
    "ITC",
    "SBIN",
    "BHARTIARTL",
    "KOTAKBANK",
    "20MICRONS",
    "AAATECH",
    "ABBOTINDIA",
    "AFFLE",
    "HBLENGINE",
  ];

  return symbols.map((symbol) => ({
    symbol: symbol,
  }));
}

export default function Index() {
  const router = useRouter();
  const { type } = router.query; // from pages/bhavcopy/[type].tsx

  // Wait for type to be available (Next.js pre-render issue)
  if (!type) return null;
  const typeStr = type as string;
  console.log("Screener Type:", typeStr);

  const [selectedCompany, setSelectedCompany] = useState(typeStr || null);
  const [loading, setLoading] = useState(false);
  // const [stocks, setStocks] = useState([]);
  // const [totalPages, setTotalPages] = useState(1);
  // const [totalItems, setTotalItems] = useState(0);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize, setPageSize] = useState(10);


  const onBack = () => {
    setSelectedCompany(null);
    router.push("/screener");
  };

  useEffect(() => {
    if (typeStr) {
      async function fetchyStocks() {
        setLoading(true);
        try {
          const response = await getYFinanceStocksByType(typeStr);
          if (response) {
            const data = await response;
            console.log(data);
            // setStocks(data.data || []);
            // setTotalPages(data.pages || 1);
            // setTotalItems(data.total || 0);
          }
        } catch (error) {
          console.error("Failed to fetch stocks:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchyStocks();
    }
  }, [typeStr]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <CompanyDashboard company={selectedCompany} onBack={onBack} />
      <main className="container mx-auto px-4 py-8">
        <CompanyPage symbol={typeStr} />
      </main>
      <NewsPage />
    </div>
  );
}
