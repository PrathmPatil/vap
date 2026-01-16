import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import renderFilter from "./RenderFilter";

export const CommonFilters = ({
  filtersConfig,
  resetFilters,
  showFilters,
}: any) => {
  return (
    <div>
      <div className={`space-y-6 ${showFilters ? "block" : "hidden xl:block"}`}>
        {filtersConfig.map((filter: any, idx: number) => (
          <div key={idx}>{renderFilter(filter)}</div>
        ))}

        <Button variant="outline" onClick={resetFilters} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset All Filters
        </Button>
      </div>
    </div>
  );
};
