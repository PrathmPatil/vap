
import { generateStrongBullishData } from "@/utils";
import { useEffect, useState } from "react";

export const useMarketSignalsData = () => {
  const [data, setData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await generateStrongBullishData("");
        const {message, data, success} = response;
        if (!success) {
          throw new Error(message || "Failed to fetch market signals data");
        }
        setData(data);
      } catch (error) {
        setError("Failed to fetch market signals data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFilters]);

  return { data, selectedFilters, setSelectedFilters, loading, error, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage };
};