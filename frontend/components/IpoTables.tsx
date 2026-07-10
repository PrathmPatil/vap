"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { IpoData, SortConfig } from "@/pages/ipo";

interface Props {
  data: IpoData[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
  showSubscription?: boolean;
}

const SortableHeader: React.FC<{
  column: string;
  sortKey: keyof IpoData;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
}> = ({ column, sortKey, sortConfig, onSort }) => {
  return (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {column}

        {sortConfig.key === sortKey ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </TableHead>
  );
};

const statusVariant = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "default";
    case "forthcoming":
      return "secondary";
    case "listed":
      return "outline";
    default:
      return "secondary";
  }
};

const stripHtml = (value?: string) =>
  value?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "";

const formatCompanyName = (ipo: IpoData) => {
  const cleaned = stripHtml(ipo.Company_Name);
  if (cleaned) return cleaned;

  return (
    ipo._URLRewrite_Folder_Name?.replace(/[-_]/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "—"
  );
};

const formatShares = (value?: string) => {
  if (!value) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("en-IN");
};

const IpoTable: React.FC<Props> = ({
  data,
  loading,
  sortConfig,
  onSort,
  showSubscription = false,
}) => {
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const key = sortConfig.key as keyof IpoData;
      const aValue = a[key];
      const bValue = b[key];

      if (!aValue) return 1;
      if (!bValue) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }

      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }

      return 0;
    });
  }, [data, sortConfig]);

  const visibleColumns = useMemo(() => {
    const checkColumn = (key: keyof IpoData) =>
      data.some(
        (row) => row[key] !== undefined && row[key] !== null && row[key] !== "",
      );

    return {
      issue_status: checkColumn("issue_status"),
      symbol: checkColumn("_id"),
      security_type: checkColumn("security_type"),
      price_band: checkColumn("price_band"),
      lot_size: checkColumn("lot_size"),
      issue_size_shares: checkColumn("issue_size_shares"),
      listing_date: checkColumn("listing_date"),
      QIB_x_: checkColumn("QIB_x_"),
      NII_x_: checkColumn("NII_x_"),
      bNII_x_: checkColumn("bNII_x_"),
      sNII_x_: checkColumn("sNII_x_"),
      Retail_x_: checkColumn("Retail_x_"),
      Employee_x_: checkColumn("Employee_x_"),
      Shareholder_x_: checkColumn("Shareholder_x_"),
      Others_x_: checkColumn("Others_x_"),
      Total_x_: checkColumn("Total_x_"),
      issueAmount: checkColumn(
        "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_",
      ),
    };
  }, [data]);

  if (loading && data.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              column="Company Name"
              sortKey="Company_Name"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            {visibleColumns.symbol && (
              <SortableHeader
                column="Symbol"
                sortKey="_id"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            <SortableHeader
              column="Security Type"
              sortKey="security_type"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            {visibleColumns.issue_status && (
              <SortableHeader
                column="Status"
                sortKey="issue_status"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            <SortableHeader
              column="Issue Start Date"
              sortKey="_Issue_Open_Date"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            <SortableHeader
              column="Issue End Date"
              sortKey="_Issue_Close_Date"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            {visibleColumns.listing_date && (
              <SortableHeader
                column="Listing Date"
                sortKey="listing_date"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {visibleColumns.price_band && (
              <SortableHeader
                column="Price Band"
                sortKey="price_band"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {visibleColumns.lot_size && (
              <SortableHeader
                column="Lot Size"
                sortKey="lot_size"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {showSubscription && visibleColumns.issue_size_shares && (
              <SortableHeader
                column="Shares Offered"
                sortKey="issue_size_shares"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.issue_size_shares && (
              <SortableHeader
                column="Issue Size (Shares)"
                sortKey="issue_size_shares"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {visibleColumns.issueAmount && (
              <SortableHeader
                column="Issue Size (Cr)"
                sortKey="Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {showSubscription && visibleColumns.Total_x_ && (
              <SortableHeader
                column="Total Subscribed (x)"
                sortKey="Total_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.QIB_x_ && (
              <SortableHeader
                column="QIB"
                sortKey="QIB_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.NII_x_ && (
              <SortableHeader
                column="NII"
                sortKey="NII_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.bNII_x_ && (
              <SortableHeader
                column="bNII"
                sortKey="bNII_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.sNII_x_ && (
              <SortableHeader
                column="sNII"
                sortKey="sNII_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.Retail_x_ && (
              <SortableHeader
                column="Retail"
                sortKey="Retail_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.Employee_x_ && (
              <SortableHeader
                column="Employee"
                sortKey="Employee_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.Shareholder_x_ && (
              <SortableHeader
                column="Shareholder"
                sortKey="Shareholder_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.Others_x_ && (
              <SortableHeader
                column="Others"
                sortKey="Others_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            {!showSubscription && visibleColumns.Total_x_ && (
              <SortableHeader
                column="Total Sub."
                sortKey="Total_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedData.length > 0 ? (
            sortedData.map((ipo, index) => (
              <TableRow key={`${ipo._id || ipo.Company_Name}-${index}`} className="hover:bg-gray-50">
                <TableCell className="font-medium min-w-[220px]">
                  {formatCompanyName(ipo)}
                </TableCell>

                {visibleColumns.symbol && (
                  <TableCell className="font-mono text-sm">
                    {ipo._id || "—"}
                  </TableCell>
                )}

                <TableCell>{ipo.security_type || "EQ"}</TableCell>

                {visibleColumns.issue_status && (
                  <TableCell>
                    <Badge variant={statusVariant(ipo.issue_status)}>
                      {ipo.issue_status || "—"}
                    </Badge>
                  </TableCell>
                )}

                <TableCell>{ipo._Issue_Open_Date || "—"}</TableCell>
                <TableCell>{ipo._Issue_Close_Date || "—"}</TableCell>

                {visibleColumns.listing_date && (
                  <TableCell>{ipo.listing_date || "—"}</TableCell>
                )}

                {visibleColumns.price_band && (
                  <TableCell>{ipo.price_band || "—"}</TableCell>
                )}

                {visibleColumns.lot_size && (
                  <TableCell>{ipo.lot_size || "—"}</TableCell>
                )}

                {visibleColumns.issue_size_shares && (
                  <TableCell>{formatShares(ipo.issue_size_shares)}</TableCell>
                )}

                {visibleColumns.issueAmount && (
                  <TableCell>
                    {ipo.Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_
                      ? `${ipo.Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_}`
                      : "—"}
                  </TableCell>
                )}

                {showSubscription && visibleColumns.Total_x_ && (
                  <TableCell className="font-semibold text-green-600">
                    {ipo.Total_x_ || "—"}
                  </TableCell>
                )}

                {!showSubscription && visibleColumns.QIB_x_ && (
                  <TableCell>{ipo.QIB_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.NII_x_ && (
                  <TableCell>{ipo.NII_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.bNII_x_ && (
                  <TableCell>{ipo.bNII_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.sNII_x_ && (
                  <TableCell>{ipo.sNII_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.Retail_x_ && (
                  <TableCell>{ipo.Retail_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.Employee_x_ && (
                  <TableCell>{ipo.Employee_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.Shareholder_x_ && (
                  <TableCell>{ipo.Shareholder_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.Others_x_ && (
                  <TableCell>{ipo.Others_x_ || "—"}</TableCell>
                )}

                {!showSubscription && visibleColumns.Total_x_ && (
                  <TableCell className="font-semibold text-green-600">
                    {ipo.Total_x_ || "—"}
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={20}
                className="text-center py-8 text-gray-500"
              >
                No IPO data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default IpoTable;
