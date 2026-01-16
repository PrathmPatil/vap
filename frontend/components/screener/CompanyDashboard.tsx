"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Building,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  DollarSign,
} from "lucide-react";

import FinancialTable from "./FinancialTable";
import DynamicTable from "./DynamicTable";
import ProsCons from "./ProsCons";
import DocumentsSection from "./DocumentsSection";
import AboutSection from "./AboutSection";
import StockChart from "../CompanyAnalysisClientPage";

import {
  FinancialMetric,
  QuarterlyResult,
  ShareholdingPattern,
  KeyValueMetric,
} from "@/lib/financial";
import { StockData } from "@/lib/screener";
import { getScreenerData, getYFinanceData } from "@/utils";

/* -------------------------------- utils -------------------------------- */
export interface YFinanceResponse {
  success: boolean;
  data: StockData[];
}

const formatNumber = (value: number, isPercent = false) => {
  if (value === null || value === undefined) return "—";
  if (isPercent) return `${value.toFixed(2)}%`;
  if (Math.abs(value) >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

/* ------------------------------ props type ------------------------------ */

interface CompanyDashboardProps {
  company: string | null;
  onBack: () => void;
}

/* ----------------------------- component ------------------------------- */

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  company,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [sheets, setSheets] = useState<Record<string, any>>({});

  /* --------------------------- fetch stocks ---------------------------- */

  const fetchStocks = useCallback(async () => {
    if (!company) return;

    setLoading(true);
    try {
      const response = await getYFinanceData(company);
      setStocks(response?.data ?? []);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    } finally {
      setLoading(false);
    }
  }, [company]);

  /* -------------------------- fetch sheets ----------------------------- */

  const fetchSheets = useCallback(async () => {
    if (!company) return;

    setLoading(true);
    try {
      const response = await getScreenerData(company);
      if (response?.success && response.data) {
        setSheets(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch screener data:", error);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (!company) return;
    fetchStocks();
    fetchSheets();
  }, [company, fetchStocks, fetchSheets]);

  /* ------------------------------- tabs -------------------------------- */

  const tabs = [
    { id: "all", label: "All", icon: Users },
    { id: "balance_sheet", label: "Balance Sheet", icon: BarChart3 },
    { id: "profit_loss", label: "Profit & Loss", icon: DollarSign },
    { id: "cash_flow", label: "Cash Flow", icon: TrendingUp },
    { id: "other_data_ratios", label: "Ratios", icon: BarChart3 },
    { id: "quarterly_results", label: "Quarterly Results", icon: Calendar },
    { id: "shareholding_pattern", label: "Shareholding", icon: Users },
  ];

  /* --------------------------- data cleanup ---------------------------- */

  const excludedKeys = [
    "company_financials",
    "profit_loss",
    "other_data_unknown_section",
    "companies",
  ];

  const financialData = Object.fromEntries(
    Object.entries(sheets).filter(([key]) => !excludedKeys.includes(key))
  );

  const companyDataRaw = Object.fromEntries(
    Object.entries(sheets).filter(([key]) => excludedKeys.includes(key))
  );

  const companyData = {
    ...companyDataRaw,
    profit_loss: Array.isArray(companyDataRaw.profit_loss)
      ? companyDataRaw.profit_loss.map((item: any) => ({
          key: item.col1,
          value: item.col2,
        }))
      : [],
  };

  /* ---------------------------- renderers ------------------------------ */

  const renderContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <FinancialTable
            title="All Data"
            data={Object.values(financialData).flat()}
          />
        );
      case "balance_sheet":
        return (
          <FinancialTable
            title="Balance Sheet"
            data={sheets.balance_sheet ?? []}
          />
        );
      case "profit_loss":
        return (
          <FinancialTable
            title="Profit & Loss Statement"
            data={sheets.profit_loss ?? []}
          />
        );
      case "cash_flow":
        return (
          <FinancialTable
            title="Cash Flow Statement"
            data={sheets.cash_flow ?? []}
          />
        );
      case "other_data_ratios":
        return (
          <FinancialTable
            title="Financial Ratios"
            data={sheets.other_data_ratios ?? []}
          />
        );
      case "quarterly_results":
        return (
          <FinancialTable
            title="Quarterly Results"
            data={sheets.quarterly_results ?? []}
          />
        );
      case "shareholding_pattern":
        return (
          <FinancialTable
            title="Shareholding Pattern"
            data={sheets.shareholding_pattern ?? []}
          />
        );
      default:
        return <FinancialTable title="" data={[]} />;
    }
  };

  const renderCompanyTables = () => (
    <>
      {Object.entries(companyData).map(([key, value]) => (
        <DynamicTable
          key={key}
          title={key.replace(/_/g, " ").toUpperCase()}
          data={value}
        />
      ))}
    </>
  );

  const stock = stocks.length > 0 ? stocks[0] : null;

  /* ----------------------------- static ------------------------------- */

  const extraData = {
    pros: [
      "Strong brand presence",
      "High ROE and ROCE",
      "Regular dividend payout",
    ],
    cons: ["High P/E ratio compared to industry", "Global slowdown risks"],
    documents: [
      { title: "Annual Report 2024", link: "#" },
      { title: "Q4 FY24 Results", link: "#" },
      { title: "Concall Transcript Q4 FY24", link: "#" },
    ],
  };

  /* ------------------------------- UI -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Search
        </button>

        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{company ?? "—"}</h1>
            <span className="text-xl text-blue-600">
              {stock?.name ?? "—"}
            </span>
            <AboutSection text={stock?.industry ?? ""} />
          </div>
        </div>

        {/* Metrics */}
        {loading ? (
          <p>Loading stock data...</p>
        ) : stock ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { key: "marketCap", label: "Market Cap" },
              { key: "currentPrice", label: "Price" },
              { key: "changePercent", label: "Change %" },
              { key: "volume", label: "Volume" },
            ].map((field) => (
              <div
                key={field.key}
                className="bg-white p-4 rounded-lg border"
              >
                <div className="text-sm text-gray-600">{field.label}</div>
                <div className="text-lg font-semibold">
                  {typeof stock[field.key as keyof StockData] === "number"
                    ? formatNumber(
                        stock[field.key as keyof StockData] as number,
                        field.key.includes("Percent")
                      )
                    : stock[field.key as keyof StockData] ?? "—"}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <StockChart />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderContent()}
        <ProsCons pros={extraData.pros} cons={extraData.cons} />
        {renderCompanyTables()}
        <DocumentsSection documents={extraData.documents} />
      </div>
    </div>
  );
};

export default CompanyDashboard;
