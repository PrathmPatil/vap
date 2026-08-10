import {
  exportFormulaXlsx,
  getFormulaCompanies,
  getFormulaData,
} from "@/utils";
import { FORMULA_CATALOG } from "@/lib/formulaCatalog";
import { useCallback, useEffect, useState } from "react";

function slugForFilename(value: string) {
  return (
    String(value || "formula")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "formula"
  );
}

const CURRENT_DAY_FORMULAS = new Set([
  "strong-bullish-candle",
  "bearish-candle",
  "gap-up-day",
  "gap-down-day",
  "top-gainer-day",
  "top-loser-day",
  "daily-mover-up",
  "daily-mover-down",
]);

const CHANGE_PERCENT_FORMULAS = new Set([
  "strong-bullish-candle",
  "bearish-candle",
  "top-gainer-day",
  "top-loser-day",
  "daily-mover-up",
  "daily-mover-down",
]);

export type FormulaCompanyOption = {
  symbol: string;
  security?: string;
  label?: string;
};

const clampPageSize = (value: number) =>
  Math.min(50, Math.max(1, Math.trunc(Number(value) || 10)));

export const useMarketSignalsData = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPageState] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "strong-bullish-candle",
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [basePercent, setBasePercent] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [companies, setCompanies] = useState<FormulaCompanyOption[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [changePercentMin, setChangePercentMin] = useState<string>("");
  const [changePercentMax, setChangePercentMax] = useState<string>("");
  const [changeSort, setChangeSort] = useState<"asc" | "desc">("desc");

  const formulaType = selectedFilters[0];
  const usesCurrentDay = CURRENT_DAY_FORMULAS.has(formulaType);
  const usesChangePercent = CHANGE_PERCENT_FORMULAS.has(formulaType);

  const setItemsPerPage = (value: number) => {
    setItemsPerPageState(clampPageSize(value));
    setCurrentPage(1);
  };

  const parsedChangeMin =
    changePercentMin === "" ? null : Number(changePercentMin);
  const parsedChangeMax =
    changePercentMax === "" ? null : Number(changePercentMax);

  const buildColumns = useCallback((rows: any[]) => {
    if (!rows?.length) {
      setColumns(null);
      return;
    }

    const hiddenKeys = new Set([
      "id",
      "trade_date",
      "tradedate",
      "created_at",
      "updated_at",
      "createdat",
      "updatedat",
      "base_percent",
    ]);

    const generatedColumns = Object.keys(rows[0])
      .filter((key) => !hiddenKeys.has(key.toLowerCase()))
      .map((key) => ({
        key,
        label: key.replace(/_/g, " ").toUpperCase(),
        sortable: true,
        searchable: true,
        format: (value: any) => {
          if (key.includes("price")) return `₹${Number(value).toFixed(2)}`;
          if (key.includes("percent")) return `${Number(value).toFixed(2)}%`;
          return value;
        },
      }));

    setColumns(generatedColumns);
  }, []);

  const fetchFormulaRows = useCallback(async () => {
    if (!formulaType) return;

    if (
      basePercent <= 0 &&
      (formulaType === "strong-bullish-candle" ||
        formulaType === "bearish-candle")
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getFormulaData(
        formulaType,
        currentPage,
        itemsPerPage,
        {
          searchTerm,
          basePercent,
          targetDate: usesCurrentDay ? null : selectedDate || null,
          symbol: selectedSymbol || null,
          changePercentMin: usesChangePercent ? parsedChangeMin : null,
          changePercentMax: usesChangePercent ? parsedChangeMax : null,
          changeSort: usesChangePercent ? changeSort : undefined,
        }
      );

      const {
        message,
        data: rows,
        success,
        totalPages: apiTotalPages,
        totalItems: apiTotalItems,
        trade_date,
        latest_date,
      } = response;

      if (!success) {
        throw new Error(message || "Failed to fetch market signals data");
      }

      const safeRows = rows || [];
      buildColumns(safeRows);
      setData(safeRows);
      setTradeDate(trade_date || latest_date || selectedDate || null);
      setTotalPages(
        apiTotalPages ??
          (Math.ceil((safeRows.length || 0) / itemsPerPage) || 1)
      );
      setTotalItems(apiTotalItems ?? safeRows.length);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Failed to fetch market signals data");
      setData([]);
      setColumns(null);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [
    formulaType,
    currentPage,
    itemsPerPage,
    searchTerm,
    basePercent,
    selectedDate,
    selectedSymbol,
    usesCurrentDay,
    usesChangePercent,
    parsedChangeMin,
    parsedChangeMax,
    changeSort,
    buildColumns,
  ]);

  useEffect(() => {
    if (!formulaType) return;

    getFormulaCompanies(formulaType, {
      targetDate: usesCurrentDay ? null : selectedDate || null,
      searchTerm,
      basePercent,
    })
      .then((response) => setCompanies(response.companies || []))
      .catch(() => setCompanies([]));
  }, [formulaType, selectedDate, searchTerm, basePercent, usesCurrentDay]);

  useEffect(() => {
    fetchFormulaRows();
  }, [fetchFormulaRows]);

  const handleSearch = async (term: string, nextBasePercent = basePercent) => {
    setSearchTerm(term);
    setBasePercent(nextBasePercent);
    if (usesCurrentDay) setSelectedDate("");
    setCurrentPage(1);
  };

  const handleFormulaChange = (value: string) => {
    setSelectedFilters([value]);
    setSelectedSymbol("");
    setSearchTerm("");
    setSelectedDate("");
    setCurrentPage(1);
    setChangePercentMin("");
    setChangePercentMax("");
    setChangeSort("desc");
    if (value === "gap-up-day" || value === "gap-down-day") {
      setBasePercent(1);
    } else if (
      value === "top-gainer-day" ||
      value === "top-loser-day" ||
      value === "daily-mover-up" ||
      value === "daily-mover-down"
    ) {
      setBasePercent(3);
    } else if (value === "strong-bullish-candle" || value === "bearish-candle") {
      setBasePercent(2);
    }
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedSymbol("");
    setCurrentPage(1);
  };

  const handleSymbolChange = (value: string) => {
    setSelectedSymbol(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    const formulaLabel =
      FORMULA_CATALOG.find((f) => f.value === formulaType)?.label ||
      formulaType ||
      "formula";
    const datePart =
      tradeDate || selectedDate || new Date().toISOString().slice(0, 10);
    const filename = `${slugForFilename(formulaLabel)}_${slugForFilename(
      String(datePart).slice(0, 10)
    )}.xlsx`;

    await exportFormulaXlsx(formulaType, {
      searchTerm,
      basePercent,
      targetDate: usesCurrentDay ? null : selectedDate || null,
      symbol: selectedSymbol || null,
      changePercentMin: usesChangePercent ? parsedChangeMin : null,
      changePercentMax: usesChangePercent ? parsedChangeMax : null,
      changeSort: usesChangePercent ? changeSort : undefined,
      filename,
    });
  };

  return {
    data,
    columns,
    selectedFilters,
    setSelectedFilters: handleFormulaChange,
    loading,
    error,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    handleSearch,
    searchTerm,
    handleExport,
    setBasePercent,
    basePercent,
    totalPages,
    totalItems,
    selectedDate,
    setSelectedDate: handleDateChange,
    selectedSymbol,
    setSelectedSymbol: handleSymbolChange,
    companies,
    tradeDate,
    changePercentMin,
    setChangePercentMin: (value: string) => {
      setChangePercentMin(value);
      setCurrentPage(1);
    },
    changePercentMax,
    setChangePercentMax: (value: string) => {
      setChangePercentMax(value);
      setCurrentPage(1);
    },
    changeSort,
    setChangeSort: (value: "asc" | "desc") => {
      setChangeSort(value);
      setCurrentPage(1);
    },
    usesChangePercent,
  };
};
