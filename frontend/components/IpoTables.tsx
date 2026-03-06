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
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Types
interface IpoData {
  id: number;
  _id: string;
  _URLRewrite_Folder_Name: string;
  created_at: string;
  type: "mainboard_data" | "sme_data";

  Company_Name?: string;
  Open_Date?: string;
  Close_Date?: string;
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

// Sortable Header Component
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
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <SortableHeader column="Company" sortKey="Company_Name" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Open Date" sortKey="_Issue_Open_Date" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Close Date" sortKey="_Issue_Close_Date" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="QIB" sortKey="QIB_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="NII" sortKey="NII_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="bNII" sortKey="bNII_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="sNII" sortKey="sNII_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Retail" sortKey="Retail_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Employee" sortKey="Employee_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Shareholder" sortKey="Shareholder_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Others" sortKey="Others_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Total" sortKey="Total_x_" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader column="Applications" sortKey="Applications" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader
              column="Issue Amount (Cr)"
              sortKey="Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <SortableHeader column="Created At" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedData.length > 0 ? (
            sortedData.map((ipo) => (
              <TableRow key={ipo.id} className="hover:bg-gray-50">

                <TableCell>
                  <Badge variant={ipo.type === "mainboard_data" ? "default" : "secondary"}>
                    {ipo.type === "mainboard_data" ? "Mainboard" : "SME"}
                  </Badge>
                </TableCell>

                <TableCell className="font-medium">
                  {ipo.Company_Name || "—"}
                </TableCell>

                <TableCell>{ipo._Issue_Open_Date || "—"}</TableCell>
                <TableCell>{ipo._Issue_Close_Date || "—"}</TableCell>

                <TableCell>{ipo.QIB_x_ || "—"}</TableCell>
                <TableCell>{ipo.NII_x_ || "—"}</TableCell>
                <TableCell>{ipo.bNII_x_ || "—"}</TableCell>
                <TableCell>{ipo.sNII_x_ || "—"}</TableCell>
                <TableCell>{ipo.Retail_x_ || "—"}</TableCell>
                <TableCell>{ipo.Employee_x_ || "—"}</TableCell>
                <TableCell>{ipo.Shareholder_x_ || "—"}</TableCell>
                <TableCell>{ipo.Others_x_ || "—"}</TableCell>

                <TableCell className="font-semibold text-green-600">
                  {ipo.Total_x_ || "—"}
                </TableCell>

                <TableCell>{ipo.Applications || "—"}</TableCell>

                <TableCell>
                  {ipo.Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_ || "—"}
                </TableCell>

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