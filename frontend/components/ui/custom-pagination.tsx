"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

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

  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,

  pageSizeLabel,
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

  if (!showPageButtons && !showPageSizeSelect && !pageSizeLabel) {
    return null;
  }

  return (
    <div className={`rounded-xl border bg-muted/20 p-3 ${className}`.trim()}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Page {safeCurrentPage} of {safeTotalPages}
        </span>

        <div className="flex items-center gap-2">
          {showPageSizeSelect ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Records per page
              </span>

              <select
                value={pageSize}
                onChange={(event) => {
                  const newPageSize = Number(event.target.value);

                  onPageSizeChange?.(newPageSize);
                  onPageChange(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          ) : pageSizeLabel ? (
            <Badge variant="outline" className="text-[10px]">
              {pageSizeLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      {showPageButtons ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
          >
            Prev
          </Button>

          {items.map((item) => {
            if (typeof item !== "number") {
              return (
                <span
                  key={`${item}-${safeCurrentPage}-${safeTotalPages}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  ...
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
                className={`h-8 min-w-8 px-2 font-semibold ${
                  isActive ? "shadow-sm" : "hover:bg-muted"
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
            className="h-8 px-3"
            onClick={() =>
              onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))
            }
            disabled={safeCurrentPage >= safeTotalPages}
          >
            Next
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default Pagination;