import { generateStrongBullishData, getFormulaData } from "@/utils";
import { useEffect, useState } from "react";

export const useMarketSignalsData = () => {
  const [data, setData] = useState<any>(null);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      if(basePercent <= 1) {
        // setError("Base percent must be greater than 0");
        setLoading(false);
        return;
      }

      try {
        const response = await getFormulaData(
          selectedFilters[0],
          currentPage,
          itemsPerPage,
          searchTerm,
          basePercent
        );
        const { message, data, success, totalPages, totalItems } = response;
        if (!success) {
          throw new Error(message || "Failed to fetch market signals data");
        }
        // generate the columns based on the keys of the first data item
        if (data && data.length > 0) {
          const generatedColumns = Object.keys(data[0]).map((key) => ({
            key,
            label: key.replace(/_/g, " ").toUpperCase(),
            sortable: true,
            searchable: true,
            format: (value: any) => {
              if (key.includes("price")) return `₹${value}`;
              if (key.includes("percent")) return `${value.toFixed(2)}%`;
              return value;
            },
          }));
          setColumns(generatedColumns);
        }
        setData(data);
        console.log(totalPages, totalItems, itemsPerPage);
        setTotalPages(totalPages ?? Math.ceil((data?.length || 0) / itemsPerPage));
        setTotalItems(totalItems ?? data?.length);
      } catch (error) {
        setError("Failed to fetch market signals data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFilters, currentPage, itemsPerPage]);

  const handleSearch = async (searchTerm: string, basePercent: number) => {
    setLoading(true);
    setError(null);
    setSearchTerm(searchTerm);
    if(basePercent <= 1) {
        // setError("Base percent must be greater than 0");
        setLoading(false);
        return;
      }

    try {
      const response = await getFormulaData(
        selectedFilters[0],
        currentPage,
        itemsPerPage,
        searchTerm,
        basePercent
      );
      const { message, data, success, totalPages, totalItems } = response;
      if (!success) {
        throw new Error(message || "Failed to fetch market signals data");
      }
      setData(data);
      setTotalPages(totalPages ?? Math.ceil((data?.length || 0) / itemsPerPage));
      setTotalItems(totalItems ?? data?.length);
    } catch (error) {
      setError("Failed to fetch market signals data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Implement export functionality here (e.g., convert data to CSV and trigger download)
    console.log("Exporting data:", data);
  };

  return {
    data,
    columns,
    selectedFilters,
    setSelectedFilters,
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
    totalItems
  };
};
