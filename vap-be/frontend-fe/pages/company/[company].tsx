"use client";
import { BhavcopyTable } from "@/components/BhavcopyTable";
import Navigation from "@/components/Navigation";
import { StockCharts } from "@/components/StockCharts";
import { Button } from "@/components/ui/button";
import { bhavcopyCategories, bhavcopyColumns } from "@/lib/bhavcopylist";
import { callApi } from "@/utils/apis";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

// interface Company {
//   id: number;
//   symbol: string;
//   company_name: string;
//   series: string;
//   date_of_listing: string;
//   paid_up_value: number;
//   market_lot: number;
//   isin: string;
//   face_value: number;
//   created_at: string;
// }
// {
//     "id": 1,
//     "symbol": "20MICRONS",
//     "date": "2018-07-30",
//     "open": 38.7878,
//     "high": 38.7878,
//     "low": 37.0765,
//     "close": 37.4093,
//     "volume": 8062,
//     "dividends": 0,
//     "stock_splits": 0
// }

interface Company {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dividends: number;
  stock_splits: number;
}

interface CompaniesResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: Company[];
}

const Index = () => {
  const router = useRouter();
  const { company } = router.query;
  const companyStr = company as string | undefined;

  // ✅ Always declare hooks at the top
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  // {
  //           "id": 260946,
  //           "symbol": "ATLASCYCLE",
  //           "date": "2018-07-30",
  //           "open": 138,
  //           "high": 139.9,
  //           "low": 132.5,
  //           "close": 137.75,
  //           "volume": 4845,
  //           "dividends": 0,
  //           "stock_splits": 0
  //       }
  const columns = [
    { key: "symbol", label: "Symbol", type: "text" as const },
    { key: "date", label: "Date", type: "text" as const },
    { key: "open", label: "Open", type: "text" as const },
    { key: "high", label: "High", type: "text" as const },
    { key: "low", label: "Low", type: "text" as const },
    { key: "close", label: "Close", type: "text" as const },
    { key: "volume", label: "Volume", type: "text" as const },
    { key: "dividends", label: "Dividends", type: "text" as const },
  ];

  useEffect(() => {
    if (!companyStr) return; // Don't fetch until we have a symbol

    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const url = `http://localhost:8000/vap/company-data/${companyStr}?page=${currentPage}&limit=${limit}${
          searchTerm ? `&search=${searchTerm}` : ""
        }`;
        const response = await fetch(url);
        if (response.ok) {
          const data: CompaniesResponse = await response.json();
          setCompanies(data.data || []);
          setTotalPages(data.pages || 1);
          setTotalCompanies(data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [companyStr, currentPage, searchTerm, limit]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/bhavcopy");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {!companyStr ? (
          <p className="text-center text-gray-500">Loading company data...</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="text-end flex-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {companyStr} Company Data
                </h1>
              </div>
            </div>
            <StockCharts
              data={companies}
              selectedSymbol={companyStr}
              loading={loading}
              dynamicURL={"company-data/" + companyStr}
              columns={columns}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

