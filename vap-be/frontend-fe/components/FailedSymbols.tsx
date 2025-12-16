'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { getFailedSymbolsList } from '@/utils';

interface FailedSymbol {
  id: number;
  symbol: string;
  reason: string;
  created_at: string;
}

interface FailedSymbolsResponse {
  success: boolean;
  data: FailedSymbol[];
  total?: number;
  message?: string;
}

export function FailedSymbols() {
  const [failedSymbols, setFailedSymbols] = useState<FailedSymbol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFailedSymbols = async () => {
      try {
        // OPTION 1: Type assertion (quick fix)
        const response = await getFailedSymbolsList() as FailedSymbolsResponse;
        
        // OPTION 2: Type guard approach (safer)
        // const response = await getFailedSymbolsList();
        // if (!response || typeof response !== 'object') {
        //   throw new Error('Invalid response format');
        // }
        // const data = response as FailedSymbolsResponse;
        
        // Check if the response indicates success
        if (response.success) {
          // The data is already in the response object, no need to parse JSON
          if (response.data) {
            setFailedSymbols(response.data);
          }
        } else {
          console.error('Failed to fetch symbols:', response.message);
        }
      } catch (error) {
        console.error('Failed to fetch failed symbols:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFailedSymbols();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonType = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('not found') || lowerReason.includes('invalid')) {
      return { type: 'error', icon: XCircle };
    }
    if (lowerReason.includes('timeout') || lowerReason.includes('connection')) {
      return { type: 'warning', icon: Clock };
    }
    return { type: 'default', icon: AlertTriangle };
  };

  return (
    <section id="failed" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Failed Symbols</span>
          </CardTitle>
          <CardDescription>
            Symbols that encountered issues during data processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : failedSymbols.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear!</h3>
              <p className="text-slate-600">No failed symbols found. All systems running smoothly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {failedSymbols.length} symbol{failedSymbols.length !== 1 ? 's' : ''} with issues
                </div>
                <Badge variant="destructive">
                  {failedSymbols.length} Failed
                </Badge>
              </div>
              
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedSymbols.map((failed) => {
                      const reasonInfo = getReasonType(failed.reason);
                      const ReasonIcon = reasonInfo.icon;
                      
                      return (
                        <TableRow key={failed.id}>
                          <TableCell className="font-mono font-semibold text-red-600">
                            {failed.symbol}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <ReasonIcon className="h-4 w-4 text-slate-400" />
                              <span className="max-w-md truncate">{failed.reason}</span>
                            </div>
                          </TableCell>
                          <TableCell className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{formatDate(failed.created_at)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={reasonInfo.type === 'error' ? 'destructive' : reasonInfo.type === 'warning' ? 'outline' : 'secondary'}
                            >
                              {reasonInfo.type === 'error' ? 'Error' : reasonInfo.type === 'warning' ? 'Warning' : 'Issue'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}