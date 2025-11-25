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
import {
  FinancialMetric,
  QuarterlyResult,
  ShareholdingPattern,
  KeyValueMetric,
} from "@/lib/financial";
import { useRouter } from "next/router";
import { getScreenerData, getYFinanceData } from "@/utils";
import { StockData } from "@/lib/screener";
import AboutSection from "./AboutSection";
import DynamicTable from "./DynamicTable";
import ProsCons from "./ProsCons";
import DocumentsSection from "./DocumentsSection";
import StockChart from "../CompanyAnalysisClientPage";

// Helper to format numbers nicely
const formatNumber = (value: number, isPercent = false) => {
  if (value === null || value === undefined) return "—";
  if (isPercent) return `${value.toFixed(2)}%`;
  if (Math.abs(value) >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

interface CompanyDashboardProps {
  company: string | null;
  onBack: () => void;
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  company,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [balanceSheetData, setBalanceSheetData] = useState<FinancialMetric[]>(
    []
  );
  const [profitLossData, setProfitLossData] = useState<FinancialMetric[]>([]);
  const [cashFlowData, setCashFlowData] = useState<FinancialMetric[]>([]);
  const [ratiosData, setRatiosData] = useState<FinancialMetric[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyResult[]>([]);
  const [shareholdingData, setShareholdingData] = useState<
    ShareholdingPattern[]
  >([]);
  const [keyMetrics, setKeyMetrics] = useState<KeyValueMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [sheets, setSheets] = useState<any | {}>({});
  const navigation = useRouter();

  // Fetch YFinance data
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getYFinanceData(company);
      setStocks(data?.data || []);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    } finally {
      setLoading(false);
    }
  }, [company]);

  // getScreenerData for other data later
  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScreenerData(company);
      if (data.success && data.data) {
        setSheets(data?.data || {});
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (company) {
      fetchStocks();
      fetchSheets();
    }
  }, [company, fetchStocks, fetchSheets]);

  const tabs = [
    { id: "all", label: "All", icon: Users },
    { id: "balance_sheet", label: "Balance Sheet", icon: BarChart3 },
    { id: "profit_loss", label: "Profit & Loss", icon: DollarSign },
    { id: "cash_flow", label: "Cash Flow", icon: TrendingUp },
    { id: "other_data_ratios", label: "Ratios", icon: BarChart3 },
    { id: "quarterly_results", label: "Quarterly Results", icon: Calendar },
    { id: "shareholding_pattern", label: "Shareholding", icon: Users },
  ];

  // after building `data`
  const excludedKeys = [
    "company_financials",
    "profit_loss",
    "other_data_unknown_section",
    "companies",
  ];

  // send only wanted keys
  const financialData = Object.fromEntries(
    Object.entries(sheets).filter(([key]) => !excludedKeys.includes(key))
  );
  const companyData = Object.fromEntries(
    Object.entries(sheets).filter(([key]) => excludedKeys.includes(key))
  );
  // Transform profit_loss if it exists
  if (companyData.profit_loss) {
    companyData.profit_loss = companyData.profit_loss.map((item: any) => ({
      key: item.col1, // col1 becomes the key name
      value: item.col2, // col2 becomes the value
    }));
  }

  console.log("Filtered Data:", financialData);
  console.log("Company Data:", companyData);
  const renderContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <FinancialTable
            title="All Data"
            data={Object.values(financialData).flat() || []}
          />
        );
      case "balance_sheet":
        return (
          <FinancialTable
            title="Balance Sheet"
            data={sheets["balance_sheet"] || []}
          />
        );
      case "profit_loss":
        return (
          <FinancialTable
            title="Profit & Loss Statement"
            data={sheets["profit_loss"] || []}
          />
        );
      case "cash_flow":
        return (
          <FinancialTable
            title="Cash Flow Statement"
            data={sheets["cash_flow"] || []}
          />
        );
      case "other_data_ratios":
        return (
          <FinancialTable
            title="Financial Ratios"
            data={sheets["other_data_ratios"] || []}
          />
        );
      case "quarterly_results":
        return (
          <FinancialTable
            title="Quarterly Results"
            data={sheets["quarterly_results"] || []}
          />
        );
      case "shareholding_pattern":
        return (
          <FinancialTable
            title="Shareholding Pattern"
            data={sheets["shareholding_pattern"] || []}
          />
        );
      default:
        return <FinancialTable title="" data={sheets["undefined"] || []} />;
    }
  };

  const renderContent2 = () => {
    return (
      <>
        {Object.entries(companyData).map(([key, value]) => (
          <DynamicTable
            key={key}
            title={key.replace(/_/g, " ").toUpperCase()}
            data={value || {}}
          />
        ))}
      </>
    );
  };

  const stock = stocks.length > 0 ? stocks[0] : null;

  let data1 = {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onBack()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Search
          </button>

          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xl text-blue-600 font-medium">
                  {stock?.name || "—"}
                </span>
                <span className="text-gray-600">{stock?.sector || ""}</span>
              </div>
              <AboutSection text={stock?.industry || ""} />
            </div>
          </div>

          {/* Key Metrics */}
          {loading ? (
            <p>Loading stock data...</p>
          ) : stock ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { key: "marketCap", label: "Market Cap" },
                { key: "currentPrice", label: "Price" },
                { key: "previousClose", label: "Prev Close" },
                { key: "change", label: "Change" },
                { key: "changePercent", label: "Change %" },
                { key: "volume", label: "Volume" },
                { key: "dividendYield", label: "Dividend Yield" },
                { key: "trailingPE", label: "P/E Ratio" },
                { key: "forwardPE", label: "Forward P/E" },
                { key: "high52Week", label: "52W High" },
                { key: "low52Week", label: "52W Low" },
                { key: "beta", label: "Beta" },
              ].map((field, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="text-sm text-gray-600 mb-1">
                    {field.label}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {typeof stock[field.key as keyof StockData] === "number"
                      ? formatNumber(
                          stock[field.key as keyof StockData] as number,
                          field.key.includes("Percent") ||
                            field.key.includes("Yield")
                        )
                      : stock[field.key as keyof StockData] || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No stock data available.</p>
          )}
        </div>

        <StockChart /> 

        {/* Tabs */}
        <div className="rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex space-x-2 p-1 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`bg-white flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {renderContent()}
        <ProsCons pros={data1.pros} cons={data1.cons} />
        {renderContent2()}
        <DocumentsSection documents={data1.documents} />
      </div>
    </div>
  );
};

export default CompanyDashboard;
