"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./button";

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  totalRecords?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;

  pageSizeLabel?: string;
  maxNumbers?: number;
  className?: string;
}

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  maxNumbers = 5
): PaginationItem[] {
  if (totalPages <= maxNumbers + 2) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const sideCount = Math.floor(maxNumbers / 2);

  let start = Math.max(2, currentPage - sideCount);
  let end = Math.min(totalPages - 1, currentPage + sideCount);

  const actualCount = end - start + 1;

  if (actualCount < maxNumbers) {
    if (start === 2) {
      end = Math.min(totalPages - 1, end + (maxNumbers - actualCount));
    } else if (end === totalPages - 1) {
      start = Math.max(2, start - (maxNumbers - actualCount));
    }
  }

  if (start > 2) {
    items.push("ellipsis-left");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);

  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  maxNumbers = 5,
  className = "",
}: PaginationProps) {
  const safeTotalPages = Math.max(totalPages || 1, 1);
  const safeCurrentPage = Math.min(Math.max(currentPage || 1, 1), safeTotalPages);
  const showPageButtons = safeTotalPages > 1;
  const showPageSizeSelect = Boolean(onPageSizeChange);

  const items = showPageButtons
    ? getPaginationItems(safeCurrentPage, safeTotalPages, maxNumbers)
    : [];

  if (!showPageButtons && !showPageSizeSelect && totalRecords == null) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ${className}`.trim()}
    >
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {totalRecords != null ? (
          <>
            <span>
              <span className="font-medium text-slate-800">
                {totalRecords.toLocaleString()}
              </span>{" "}
              records
            </span>
            <span className="text-slate-300">·</span>
          </>
        ) : null}
        <span>
          Page {safeCurrentPage}/{safeTotalPages}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {showPageButtons ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {items.map((item) => {
              if (typeof item !== "number") {
                return (
                  <span
                    key={`${item}-${safeCurrentPage}-${safeTotalPages}`}
                    className="px-0.5 text-xs text-slate-400"
                  >
                    …
                  </span>
                );
              }

              const isActive = item === safeCurrentPage;

              return (
                <Button
                  key={`page-${item}`}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={`h-7 min-w-7 px-1.5 text-xs ${
                    isActive ? "bg-slate-900 text-white hover:bg-slate-800" : ""
                  }`}
                  onClick={() => onPageChange(item)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item}
                </Button>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() =>
                onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))
              }
              disabled={safeCurrentPage >= safeTotalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}

        {showPageSizeSelect ? (
          <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="sr-only">Records per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                const newPageSize = Number(event.target.value);
                onPageSizeChange?.(newPageSize);
                onPageChange(1);
              }}
              className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Records per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}/page
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export default Pagination;
