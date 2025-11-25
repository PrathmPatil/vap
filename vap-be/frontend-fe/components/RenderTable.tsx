import React from "react";
import Link from "next/link";
import { Eye, TrendingUp, TrendingDown } from "lucide-react";
import { TableCell, TableRow } from "./ui/table";
import { Button } from "./ui/button";

export const renderTable = (
  stocks: any[],
  tableConfig: any[],
  resetFilters: () => void
) => {
  if (stocks.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={tableConfig.length + 1}
          className="text-center py-12"
        >
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              No stocks found
            </h3>
            <p className="text-slate-600">
              Try adjusting your filters or search criteria
            </p>
            <button onClick={resetFilters} className="mt-4 btn-outline">
              Reset Filters
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return stocks.map((stock) => (
    <TableRow
      key={stock.symbol}
      className="hover:bg-slate-50 transition-colors"
    >
      {tableConfig.map((col) => (
        <TableCell
          key={col.key}
          className={col.key === "symbol" ? "font-semibold text-blue-600" : ""}
        >
          {col.key === "symbol" ? (
            <Link
              href={`/screener/${(stock.symbol).split('.NS')[0]}`}
              className="hover:underline"
            >
              {stock.symbol}
            </Link>
          ) : col.key === "changePercent" ? (
            <div
              className={`flex items-center space-x-1 ${
                stock[col.key] >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stock[col.key] >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {stock[col.key] >= 0 ? "+" : ""}
                {stock[col.key]?.toFixed(2)}%
              </span>
            </div>
          ) : col.format ? (
            col.format(stock[col.key])
          ) : (
            stock[col.key] ?? ""
          )}
        </TableCell>
      ))}

      {/* Actions column */}
      <TableCell>
        <Link href={`/screener/${stock.symbol}`}>
          <Button variant="outline" size="sm">
            <Eye className="mr-1 h-3 w-3" />
            Analyze
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  ));
};
