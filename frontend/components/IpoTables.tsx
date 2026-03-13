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

interface IpoData {
  id: number;
  _id: string;
  _URLRewrite_Folder_Name: string;
  created_at: string;
  type: "mainboard_data" | "sme_data";

  Company_Name?: string;
  _Issue_Open_Date?: string;
  _Issue_Close_Date?: string;

  QIB_x_?: string;
  NII_x_?: string;
  bNII_x_?: string;
  sNII_x_?: string;
  Retail_x_?: string;
  Employee_x_?: string;
  Shareholder_x_?: string;
  Others_x_?: string;
  Total_x_?: string;

  Applications?: string;
  Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_?: string;
}

interface SortConfig {
  key: keyof IpoData | null;
  direction: "asc" | "desc";
}

interface Props {
  data: IpoData[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
}

const SortableHeader: React.FC<{
  column: string;
  sortKey: keyof IpoData;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
}> = ({ column, sortKey, sortConfig, onSort }) => {
  return (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 transition-colors"
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

const IpoTable: React.FC<Props> = ({
  data,
  loading,
  sortConfig,
  onSort,
}) => {

  /* ---------------- SORT DATA ---------------- */

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

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

  /* ---------------- COLUMN VISIBILITY ---------------- */

  const visibleColumns = useMemo(() => {
    const checkColumn = (key: keyof IpoData) =>
      data.some(
        (row) => row[key] !== undefined && row[key] !== null && row[key] !== ""
      );

    return {
      Company_Name: checkColumn("Company_Name"),
      QIB_x_: checkColumn("QIB_x_"),
      NII_x_: checkColumn("NII_x_"),
      bNII_x_: checkColumn("bNII_x_"),
      sNII_x_: checkColumn("sNII_x_"),
      Retail_x_: checkColumn("Retail_x_"),
      Employee_x_: checkColumn("Employee_x_"),
      Shareholder_x_: checkColumn("Shareholder_x_"),
      Others_x_: checkColumn("Others_x_"),
      Total_x_: checkColumn("Total_x_"),
      Applications: checkColumn("Applications"),
      IssueAmount: checkColumn(
        "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
      ),
    };
  }, [data]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
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

        {/* ---------------- HEADER ---------------- */}

        <TableHeader>
          <TableRow>

            <TableHead>Type</TableHead>

           {visibleColumns.Company_Name && (
             <SortableHeader
              column="Company"
              sortKey="Company_Name"
              sortConfig={sortConfig}
              onSort={onSort}
            />)}

            <SortableHeader
              column="Open Date"
              sortKey="_Issue_Open_Date"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            <SortableHeader
              column="Close Date"
              sortKey="_Issue_Close_Date"
              sortConfig={sortConfig}
              onSort={onSort}
            />

            {visibleColumns.QIB_x_ && (
              <SortableHeader column="QIB" sortKey="QIB_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.NII_x_ && (
              <SortableHeader column="NII" sortKey="NII_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.bNII_x_ && (
              <SortableHeader column="bNII" sortKey="bNII_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.sNII_x_ && (
              <SortableHeader column="sNII" sortKey="sNII_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Retail_x_ && (
              <SortableHeader column="Retail" sortKey="Retail_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Employee_x_ && (
              <SortableHeader column="Employee" sortKey="Employee_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Shareholder_x_ && (
              <SortableHeader column="Shareholder" sortKey="Shareholder_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Others_x_ && (
              <SortableHeader column="Others" sortKey="Others_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Total_x_ && (
              <SortableHeader column="Total" sortKey="Total_x_" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.Applications && (
              <SortableHeader column="Applications" sortKey="Applications" sortConfig={sortConfig} onSort={onSort}/>
            )}

            {visibleColumns.IssueAmount && (
              <SortableHeader
                column="Issue Amount (Cr)"
                sortKey="Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            )}

            <SortableHeader
              column="Created At"
              sortKey="created_at"
              sortConfig={sortConfig}
              onSort={onSort}
            />

          </TableRow>
        </TableHeader>

        {/* ---------------- BODY ---------------- */}

        <TableBody>

          {sortedData.length > 0 ? (
            sortedData.map((ipo) => (

              <TableRow key={ipo.id} className="hover:bg-gray-50">

                <TableCell>
                  <Badge
                    variant={
                      ipo.type === "mainboard_data" ? "default" : "secondary"
                    }
                  >
                    {ipo.type === "mainboard_data" ? "Mainboard" : "SME"}
                  </Badge>
                </TableCell>

                {ipo.Company_Name && (
                  <TableCell className="font-medium">
                    {ipo.Company_Name || "—"}
                  </TableCell>
                )}

                <TableCell>{ipo._Issue_Open_Date || "—"}</TableCell>
                <TableCell>{ipo._Issue_Close_Date || "—"}</TableCell>

                {visibleColumns.QIB_x_ && (
                  <TableCell>{ipo.QIB_x_ || "—"}</TableCell>
                )}

                {visibleColumns.NII_x_ && (
                  <TableCell>{ipo.NII_x_ || "—"}</TableCell>
                )}

                {visibleColumns.bNII_x_ && (
                  <TableCell>{ipo.bNII_x_ || "—"}</TableCell>
                )}

                {visibleColumns.sNII_x_ && (
                  <TableCell>{ipo.sNII_x_ || "—"}</TableCell>
                )}

                {visibleColumns.Retail_x_ && (
                  <TableCell>{ipo.Retail_x_ || "—"}</TableCell>
                )}

                {visibleColumns.Employee_x_ && (
                  <TableCell>{ipo.Employee_x_ || "—"}</TableCell>
                )}

                {visibleColumns.Shareholder_x_ && (
                  <TableCell>{ipo.Shareholder_x_ || "—"}</TableCell>
                )}

                {visibleColumns.Others_x_ && (
                  <TableCell>{ipo.Others_x_ || "—"}</TableCell>
                )}

                {visibleColumns.Total_x_ && (
                  <TableCell className="font-semibold text-green-600">
                    {ipo.Total_x_ || "—"}
                  </TableCell>
                )}

                {visibleColumns.Applications && (
                  <TableCell>{ipo.Applications || "—"}</TableCell>
                )}

                {visibleColumns.IssueAmount && (
                  <TableCell>
                    {ipo.Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_ || "—"}
                  </TableCell>
                )}

                <TableCell>
                  {new Date(ipo.created_at).toLocaleDateString()}
                </TableCell>

              </TableRow>

            ))
          ) : (
            <TableRow>
              <TableCell colSpan={16} className="text-center py-8 text-gray-500">
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