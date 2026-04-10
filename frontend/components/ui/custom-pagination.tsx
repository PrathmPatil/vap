import React, { useMemo } from "react";

/**
 * Helper to generate page numbers with ellipses
 */
const getPaginationWithDots = (currentPage, totalPages) => {
  const pages = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
  }
  return pages;
};

export default function CustomPagination({
  page = 1,
  limit = 10,
  totalRecords = 0, // Total number of items
  totalPages = 0,   // Total number of pages
  onPageChange,
  onLimitChange,
}) {
  // Use the provided totalPages, or calculate it if only totalRecords is provided
  const finalTotalPages = totalPages || Math.ceil(totalRecords / limit) || 1;

  const pages = useMemo(
    () => getPaginationWithDots(page, finalTotalPages),
    [page, finalTotalPages]
  );

  const buttonStyle = (isActive) => ({
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
    <div style={{ 
      fontFamily: "system-ui, sans-serif", 
      display: "flex", 
      flexDirection: "column", 
      gap: "12px",
      padding: "16px" 
    }}>
      
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Previous Button */}
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ ...buttonStyle(false), opacity: page <= 1 ? 0.5 : 1 }}
          aria-label="Previous Page"
        >
          &laquo;
        </button>

        {/* Page Numbers */}
        {pages.map((p, index) =>
          p === "..." ? (
            <span key={`dots-${index}`} style={{ padding: "0 8px", color: "#666" }}>
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={buttonStyle(p === page)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          disabled={page >= finalTotalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ ...buttonStyle(false), opacity: page >= finalTotalPages ? 0.5 : 1 }}
          aria-label="Next Page"
        >
          &raquo;
        </button>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        fontSize: "14px", 
        color: "#666" 
      }}>
        {/* Info Text */}
        <div>
          Showing page <b>{page}</b> of <b>{finalTotalPages}</b>
          {totalRecords > 0 && ` (${totalRecords} items)`}
        </div>

        {/* Limit Selector */}
        {onLimitChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="page-limit">Rows per page:</label>
            <select
              id="page-limit"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{ 
                padding: "4px 8px", 
                borderRadius: "4px", 
                border: "1px solid #ccc",
                outline: "none"
              }}
            >
              {[5, 10, 20, 50].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}