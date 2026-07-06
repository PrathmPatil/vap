import {
  getFormulaAvailableDates,
  getFormulaCompanies,
  getFormulaData,
} from "@/utils";
import { useCallback, useEffect, useState } from "react";

export type FormulaCompanyOption = {
  symbol: string;
  security?: string;
  label?: string;
};

export const useMarketSignalsData = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "follow-through-day",
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [basePercent, setBasePercent] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoaded, setDatesLoaded] = useState(false);
  const [companies, setCompanies] = useState<FormulaCompanyOption[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);

  const formulaType = selectedFilters[0];

  const buildColumns = useCallback((rows: any[]) => {
    if (!rows?.length) {
      setColumns(null);
      return;
    }

    const generatedColumns = Object.keys(rows[0]).map((key) => ({
      key,
      label: key.replace(/_/g, " ").toUpperCase(),
      sortable: true,
      searchable: true,
      format: (value: any) => {
        if (key.includes("price")) return `₹${value}`;
        if (key.includes("percent")) return `${Number(value).toFixed(2)}%`;
        return value;
      },
    }));

    setColumns(generatedColumns);
  }, []);

  const loadFilterOptions = useCallback(async () => {
    if (!formulaType) return;

    try {
      setDatesLoaded(false);

      const datesResponse = await getFormulaAvailableDates(
        formulaType,
        basePercent
      );

      const dates = datesResponse.dates || [];
      setAvailableDates(dates);
      setDatesLoaded(true);

      const nextDate =
        selectedDate && dates.includes(selectedDate)
          ? selectedDate
          : datesResponse.latest_date || dates[0] || "";

      if (nextDate !== selectedDate) {
        setSelectedDate(nextDate);
      }

      if (!dates.length) {
        setCompanies([]);
        return;
      }

      const companiesResponse = await getFormulaCompanies(formulaType, {
        targetDate: nextDate || null,
        basePercent,
      });

      setCompanies(companiesResponse.companies || []);
    } catch (filterError) {
      console.error("Failed to load formula filters:", filterError);
      setAvailableDates([]);
      setCompanies([]);
      setDatesLoaded(true);
      setSelectedDate("");
    }
  }, [formulaType, basePercent, selectedDate]);

  const fetchFormulaRows = useCallback(async () => {
    if (!formulaType) return;

    if (datesLoaded && availableDates.length === 0) {
      setLoading(false);
      setError(null);
      setData([]);
      setColumns(null);
      setTradeDate(null);
      setTotalPages(1);
      setTotalItems(0);
      return;
    }

    if (
      basePercent <= 1 &&
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
          targetDate: selectedDate || null,
          symbol: selectedSymbol || null,
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
    availableDates,
    datesLoaded,
    buildColumns,
  ]);

  useEffect(() => {
    loadFilterOptions();
  }, [formulaType, basePercent]);

  useEffect(() => {
    if (!formulaType) return;

    getFormulaCompanies(formulaType, {
      targetDate: selectedDate || null,
      searchTerm,
      basePercent,
    })
      .then((response) => setCompanies(response.companies || []))
      .catch(() => setCompanies([]));
  }, [formulaType, selectedDate, searchTerm, basePercent]);

  useEffect(() => {
    fetchFormulaRows();
  }, [fetchFormulaRows]);

  const handleSearch = async (term: string, nextBasePercent = basePercent) => {
    setSearchTerm(term);
    setBasePercent(nextBasePercent);
    setCurrentPage(1);
  };

  const handleFormulaChange = (value: string) => {
    setSelectedFilters([value]);
    setSelectedSymbol("");
    setSearchTerm("");
    setSelectedDate("");
    setAvailableDates([]);
    setDatesLoaded(false);
    setCurrentPage(1);
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

  const handleExport = () => {
    console.log("Exporting data:", data);
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
    availableDates,
    datesLoaded,
    companies,
    tradeDate,
  };
};
