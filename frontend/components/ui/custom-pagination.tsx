import React, { useMemo } from "react";

/**
 * Helper to generate page numbers with ellipses
 */
const getPaginationWithDots = (currentPage: number, totalPages: number) => {
  const pages = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
  }
  return pages;
};

interface CustomPaginationProps {
  page?: number;
  limit?: number;
  totalRecords?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function CustomPagination({
  page = 1,
  limit = 10,
  totalRecords = 0, // Total number of items
  totalPages = 0, // Total number of pages
  onPageChange,
  onLimitChange,
}: CustomPaginationProps) {
  // Use the provided totalPages, or calculate it if only totalRecords is provided
  const finalTotalPages = totalPages || Math.ceil(totalRecords / limit) || 1;

  const pages = useMemo(
    () => getPaginationWithDots(page, finalTotalPages),
    [page, finalTotalPages],
  );

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    cursor: isActive ? "default" : "pointer",
    background: isActive ? "#007bff" : "#fff",
    color: isActive ? "#fff" : "#333",
    fontWeight: isActive ? "600" : "400",
    transition: "all 0.2s ease",
    minWidth: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: isActive ? "none" : "auto",
  });

  return (
    <div className="flex items-center justify-between" >
      <div>
          Showing page <b>{page}</b> of <b>{finalTotalPages}</b>
          {totalRecords > 0 && ` (${totalRecords} items)`}
        </div>
      <div className="flex items-center justify-end gap-2">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-limit">Rows per page:</label>
            <select
              id="page-limit"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 10, 20, 50].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
        <div
        className="flex gap-2 items-center flex-wrap justify-end"
        >
          {/* Previous Button */}
          <button
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            style={{ ...buttonStyle(false), opacity: page <= 1 ? 0.5 : 1 }}
            aria-label="Previous Page"
          >
            &laquo;
          </button>

          {/* Page Numbers */}
          {pages.map((p, index) =>
            p === "..." ? (
              <span
                key={`dots-${index}`}
                style={{ padding: "0 8px", color: "#666" }}
              >
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => typeof p === "number" && onPageChange?.(p)}
                style={buttonStyle(p === page)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ),
          )}

          {/* Next Button */}
          <button
            disabled={page >= finalTotalPages}
            onClick={() => onPageChange?.(page + 1)}
            style={{
              ...buttonStyle(false),
              opacity: page >= finalTotalPages ? 0.5 : 1,
            }}
            aria-label="Next Page"
          >
            &raquo;
          </button>
        </div>
      </div>
    </div>
  );
}
