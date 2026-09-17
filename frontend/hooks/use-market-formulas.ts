import {
  exportFormulaXlsx,
  getFormulaCompanies,
  getFormulaData,
} from "@/utils";
import { FORMULA_CATALOG } from "@/lib/formulaCatalog";
import { useCallback, useEffect, useRef, useState } from "react";

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
  "strong-king-candle",
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
  "strong-king-candle",
  "bearish-candle",
  "top-gainer-day",
  "top-loser-day",
  "daily-mover-up",
  "daily-mover-down",
]);

const SORTABLE_FORMULAS = new Set([
  ...CHANGE_PERCENT_FORMULAS,
  "volume-breakouts",
  "rs-rank",
]);

export type FormulaCompanyOption = {
  symbol: string;
  security?: string;
  label?: string;
};

const clampPageSize = (value: number) =>
  Math.min(50, Math.max(1, Math.trunc(Number(value) || 10)));

type UseMarketSignalsOptions = {
  /** When false, skips API fetches (e.g. non-premium explore page). Default true. */
  enabled?: boolean;
};

export const useMarketSignalsData = (options: UseMarketSignalsOptions = {}) => {
  const enabled = options.enabled !== false;
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
  const [bodyPercent, setBodyPercent] = useState<number>(80);
  const [volumeRatioMin, setVolumeRatioMin] = useState<number>(2);
  const [minRsRank, setMinRsRank] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [companies, setCompanies] = useState<FormulaCompanyOption[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [rsRunMeta, setRsRunMeta] = useState<Record<string, unknown> | null>(
    null
  );
  const [rsConfirmation, setRsConfirmation] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [changePercentMin, setChangePercentMin] = useState<string>("");
  const [changePercentMax, setChangePercentMax] = useState<string>("");
  const [changeSort, setChangeSort] = useState<"asc" | "desc">("desc");

  const formulaType = selectedFilters[0];
  const formulaTypeRef = useRef(formulaType);
  formulaTypeRef.current = formulaType;

  const usesCurrentDay = CURRENT_DAY_FORMULAS.has(formulaType);
  const usesChangePercent = CHANGE_PERCENT_FORMULAS.has(formulaType);
  const usesBodyPercent = formulaType === "strong-king-candle";
  const usesVolumeRatio = formulaType === "volume-breakouts";
  const usesRsRankFilter = formulaType === "rs-rank";
  const usesSortControls = SORTABLE_FORMULAS.has(formulaType);

  const setItemsPerPage = (value: number) => {
    setItemsPerPageState(clampPageSize(value));
    setCurrentPage(1);
  };

  const parsedChangeMin =
    changePercentMin === "" ? null : Number(changePercentMin);
  const parsedChangeMax =
    changePercentMax === "" ? null : Number(changePercentMax);

  const parsedMinRsRank = minRsRank === "" ? null : Number(minRsRank);

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
      "body_percent",
      "volume_ratio_min",
    ]);

    const rsRankLabels: Record<string, string> = {
      security: "NAME OF COMPANY",
      rs_rank: "RELATIVE STRENGTH RANK",
      q1: "Q1 — 3M RETURN (2× WEIGHT)",
      q2: "Q2 — 6M RETURN",
      q3: "Q3 — 9M RETURN",
      q4: "Q4 — 12M RETURN",
      rs_score: "WEIGHTED RS SCORE",
      symbol: "SYMBOL",
      close_price: "CLOSE PRICE",
    };

    const rsRankOrder = [
      "security",
      "symbol",
      "rs_rank",
      "q1",
      "q2",
      "q3",
      "q4",
      "rs_score",
      "close_price",
    ];

    const formatCell = (key: string, value: any) => {
      if (
        key.toLowerCase() === "symbol" ||
        key.toLowerCase().endsWith("_symbol")
      ) {
        return String(value ?? "").replace(/\.(NS|BSE|BO)$/i, "");
      }
      if (key.includes("price")) return `₹${Number(value).toFixed(2)}`;
      if (/^q[1-4]$/.test(key)) {
        const num = Number(value);
        if (!Number.isFinite(num)) return value;
        return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
      }
      if (key.startsWith("rs_") && key !== "rs_rank") {
        const num = Number(value);
        if (!Number.isFinite(num)) return value;
        return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
      }
      if (key.includes("percent") || key === "rs_score")
        return key === "rs_score"
          ? Number(value).toFixed(2)
          : `${Number(value).toFixed(2)}%`;
      if (key === "volume_ratio") return `${Number(value).toFixed(2)}x`;
      if (key === "rs_rank") return String(value);
      return value;
    };

    if (formulaType === "rs-rank") {
      const available = new Set(Object.keys(rows[0]));
      const orderedKeys = rsRankOrder.filter((key) => available.has(key));
      const trailingKeys = Object.keys(rows[0]).filter(
        (key) =>
          !hiddenKeys.has(key.toLowerCase()) && !orderedKeys.includes(key),
      );

      setColumns(
        [...orderedKeys, ...trailingKeys].map((key) => ({
          key,
          label: rsRankLabels[key] || key.replace(/_/g, " ").toUpperCase(),
          sortable: true,
          searchable: true,
          format: (value: any) => formatCell(key, value),
        })),
      );
      return;
    }

    const generatedColumns = Object.keys(rows[0])
      .filter((key) => !hiddenKeys.has(key.toLowerCase()))
      .map((key) => ({
        key,
        label: key.replace(/_/g, " ").toUpperCase(),
        sortable: true,
        searchable: true,
        format: (value: any) => formatCell(key, value),
      }));

    setColumns(generatedColumns);
  }, [formulaType]);

  const fetchFormulaRows = useCallback(async () => {
    if (!enabled || !formulaType) return;

    if (
      basePercent <= 0 &&
      (formulaType === "strong-bullish-candle" ||
        formulaType === "strong-king-candle" ||
        formulaType === "bearish-candle")
    ) {
      setLoading(false);
      return;
    }

    if (bodyPercent <= 0 && formulaType === "strong-king-candle") {
      setLoading(false);
      return;
    }

    if (
      volumeRatioMin <= 0 &&
      formulaType === "volume-breakouts"
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
          bodyPercent: usesBodyPercent ? bodyPercent : undefined,
          volumeRatioMin: usesVolumeRatio ? volumeRatioMin : undefined,
          minRsRank: usesRsRankFilter ? parsedMinRsRank : null,
          targetDate: usesCurrentDay ? null : selectedDate || null,
          symbol: selectedSymbol || null,
          changePercentMin: usesChangePercent ? parsedChangeMin : null,
          changePercentMax: usesChangePercent ? parsedChangeMax : null,
          changeSort: usesSortControls ? changeSort : undefined,
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
        rs_run_meta,
        rs_confirmation,
      } = response;

      if (!success) {
        throw new Error(message || "Failed to fetch market signals data");
      }

      const safeRows = rows || [];
      buildColumns(safeRows);
      setData(safeRows);
      setTradeDate(trade_date || latest_date || selectedDate || null);
      setRsRunMeta(
        formulaType === "rs-rank" ? (rs_run_meta as Record<string, unknown>) : null
      );
      setRsConfirmation(
        formulaType === "rs-rank"
          ? (rs_confirmation as Record<string, unknown>) || null
          : null
      );
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
      setRsRunMeta(null);
      setRsConfirmation(null);
    } finally {
      setLoading(false);
    }
  }, [
    formulaType,
    currentPage,
    itemsPerPage,
    searchTerm,
    basePercent,
    bodyPercent,
    volumeRatioMin,
    parsedMinRsRank,
    selectedDate,
    selectedSymbol,
    usesCurrentDay,
    usesChangePercent,
    usesBodyPercent,
    usesVolumeRatio,
    usesRsRankFilter,
    usesSortControls,
    parsedChangeMin,
    parsedChangeMax,
    changeSort,
    buildColumns,
    enabled,
  ]);

  useEffect(() => {
    if (!enabled || !formulaType) return;

    getFormulaCompanies(formulaType, {
      targetDate: usesCurrentDay ? null : selectedDate || null,
      searchTerm,
      basePercent,
      bodyPercent,
      volumeRatioMin,
    })
      .then((response) => setCompanies(response.companies || []))
      .catch(() => setCompanies([]));
  }, [
    formulaType,
    selectedDate,
    searchTerm,
    basePercent,
    bodyPercent,
    volumeRatioMin,
    usesCurrentDay,
    enabled,
  ]);

  useEffect(() => {
    if (!enabled) return;
    fetchFormulaRows();
  }, [enabled, fetchFormulaRows]);

  const handleSearch = async (term: string, nextBasePercent = basePercent) => {
    setSearchTerm(term);
    setBasePercent(nextBasePercent);
    if (usesCurrentDay) setSelectedDate("");
    setCurrentPage(1);
  };

  const handleFormulaChange = useCallback((value: string) => {
    if (formulaTypeRef.current === value) return;

    setSelectedFilters([value]);
    setSelectedSymbol("");
    setSearchTerm("");
    setSelectedDate("");
    setCurrentPage(1);
    setChangePercentMin("");
    setChangePercentMax("");
    setChangeSort("desc");
    setMinRsRank("");

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
    } else if (value === "strong-king-candle") {
      setBasePercent(2);
      setBodyPercent(80);
    } else if (value === "volume-breakouts") {
      setVolumeRatioMin(2);
    }
  }, []);

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
      bodyPercent: usesBodyPercent ? bodyPercent : undefined,
      volumeRatioMin: usesVolumeRatio ? volumeRatioMin : undefined,
      minRsRank: usesRsRankFilter ? parsedMinRsRank : null,
      targetDate: usesCurrentDay ? null : selectedDate || null,
      symbol: selectedSymbol || null,
      changePercentMin: usesChangePercent ? parsedChangeMin : null,
      changePercentMax: usesChangePercent ? parsedChangeMax : null,
      changeSort: usesSortControls ? changeSort : undefined,
      filename,
    });
  };

  return {
    data,
    columns,
    selectedFilters,
    formulaType,
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
    bodyPercent,
    setBodyPercent: (value: number) => {
      setBodyPercent(value);
      setCurrentPage(1);
    },
    volumeRatioMin,
    setVolumeRatioMin: (value: number) => {
      setVolumeRatioMin(value);
      setCurrentPage(1);
    },
    minRsRank,
    setMinRsRank: (value: string) => {
      setMinRsRank(value);
      setCurrentPage(1);
    },
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
    usesBodyPercent,
    usesVolumeRatio,
    usesRsRankFilter,
    usesSortControls,
    rsRunMeta,
    rsConfirmation,
  };
};
