"use client";

import {
  TrendingUp,
  Building2,
  AlertTriangle,
  BarChart3,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function Navigation() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">
                MarketView
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/ipo">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Ipo</span>
              </Button>
            </Link>
            <Link href="/news">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>News</span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </Button>
            </Link>
            {/* formlas */}
            <Link href="/company/formula">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Formula</span>
              </Button>
            </Link>
            <Link href="/screener">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Screener</span>
              </Button>
            </Link>
            {/* <Button
              variant="ghost"
              onClick={() => scrollToSection("charts")}
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Charts</span>
            </Button> */}
            {/* <Button
              variant="ghost"
              onClick={() => scrollToSection("companies")}
              className="flex items-center space-x-2"
            >
              <Building2 className="h-4 w-4" />
              <span>Companies</span>
            </Button> */}
            {/* <Button
              variant="ghost"
              onClick={() => scrollToSection("failed")}
              className="flex items-center space-x-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Issues</span>
            </Button> */}
            <Link href="/bhavcopy">
              <Button variant="ghost" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Bhavcopy</span>
              </Button>
            </Link>
            <Link href="/watchlist">
              <Button variant="ghost" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Watchlist</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
