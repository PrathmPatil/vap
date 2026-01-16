'use client';

import { useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Building2, 
  Banknote, 
  PieChart,
  BarChart3,
  LineChart,
  Activity,
  DollarSign,
  Target,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { formatCellValue } from '../lib/utils'; 

import { cn } from '../lib/utils';
import Navigation from '../components/Navigation';


const bhavcopyCategories = [
  {
    id: 'bc',
    title: 'BC - Equity Bhavcopy',
    description: 'Daily equity market data including open, high, low, close prices and volumes',
    icon: TrendingUp,
    color: 'bg-blue-500',
    count: '2,000+ records'
  },
  {
    id: 'bh',
    title: 'BH - Index Data',
    description: 'Index and benchmark data with performance metrics',
    icon: BarChart3,
    color: 'bg-green-500',
    count: '50+ indices'
  },
  {
    id: 'corpbond',
    title: 'Corporate Bonds',
    description: 'Corporate bond trading data with yields and ratings',
    icon: Building2,
    color: 'bg-purple-500',
    count: '500+ bonds'
  },
  {
    id: 'etf',
    title: 'ETF Data',
    description: 'Exchange Traded Fund prices and NAV information',
    icon: PieChart,
    color: 'bg-orange-500',
    count: '100+ ETFs'
  },
  {
    id: 'ffix',
    title: 'FFIX - Fixed Income',
    description: 'Fixed income securities with yield and duration data',
    icon: Banknote,
    color: 'bg-teal-500',
    count: '300+ securities'
  },
  {
    id: 'gl',
    title: 'GL - Government Securities',
    description: 'Government bond data with maturity and coupon information',
    icon: Target,
    color: 'bg-indigo-500',
    count: '200+ securities'
  },
  {
    id: 'hl',
    title: 'HL - High/Low Data',
    description: '52-week high and low prices for all securities',
    icon: Activity,
    color: 'bg-red-500',
    count: '2,000+ records'
  },
  {
    id: 'ix',
    title: 'IX - Index Constituents',
    description: 'Index composition and weightage data',
    icon: LineChart,
    color: 'bg-cyan-500',
    count: '1,000+ constituents'
  },
  {
    id: 'mcap',
    title: 'MCAP - Market Capitalization',
    description: 'Market cap data with categorization (Large/Mid/Small cap)',
    icon: DollarSign,
    color: 'bg-yellow-500',
    count: '2,000+ companies'
  },
  {
    id: 'pd',
    title: 'PD - Price Data',
    description: 'Comprehensive price data with sector classification',
    icon: BarChart3,
    color: 'bg-pink-500',
    count: '2,000+ records'
  },
  {
    id: 'pr',
    title: 'PR - Price Records',
    description: 'Historical price records with industry classification',
    icon: FileText,
    color: 'bg-slate-500',
    count: '2,000+ records'
  }
];

export default function BhavcopyDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Bhavcopy Data Center
            </h1>
            <p className="text-slate-600 text-lg">
              Comprehensive market data across all asset classes
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">11</div>
                    <div className="text-sm text-slate-500">Data Categories</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">5,000+</div>
                    <div className="text-sm text-slate-500">Securities</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Daily</div>
                    <div className="text-sm text-slate-500">Updates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Real-time</div>
                    <div className="text-sm text-slate-500">Data Access</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bhavcopyCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${category.color} bg-opacity-10`}>
                        <IconComponent className={`h-6 w-6 text-white`} style={{ color: category.color.replace('bg-', '').replace('-500', '') }} />
                      </div>
                      <Badge variant="secondary">{category.count}</Badge>
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/bhavcopy/${category.id}`}>
                      <Button className="w-full group-hover:bg-blue-600 transition-colors">
                        View Data
                        <FileText className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>
                Frequently accessed data categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/bhavcopy/bc">
                  <Button variant="outline" size="sm">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Equity Data
                  </Button>
                </Link>
                <Link href="/bhavcopy/mcap">
                  <Button variant="outline" size="sm">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Market Cap
                  </Button>
                </Link>
                <Link href="/bhavcopy/ix">
                  <Button variant="outline" size="sm">
                    <LineChart className="mr-2 h-4 w-4" />
                    Index Data
                  </Button>
                </Link>
                <Link href="/bhavcopy/etf">
                  <Button variant="outline" size="sm">
                    <PieChart className="mr-2 h-4 w-4" />
                    ETF Data
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}