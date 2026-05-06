"use client";

import {
  TrendingUp,
  BarChart3,
  FileText,
  LogOut,
  LogIn,
  Calculator,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

function Navigation() {
  const { isAuthenticated, role, isSubscribed = true, logout } = useAuth();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">
              TrendTraders
            </span>
          </Link>

          {/* Menu */}
          <div className="hidden md:flex items-center space-x-4">

            <Link href="/">
              <Button variant="ghost">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            <Link href="/news">
              <Button variant="ghost">
                <BarChart3 className="h-4 w-4 mr-2" />
                News
              </Button>
            </Link>

            <Link href="/listed-companies">
              <Button variant="ghost">
                <Building2 className="h-4 w-4 mr-2" />
                Listed Companies
              </Button>
            </Link>

            {/* <Link href="/screener">
              <Button variant="ghost">
                <BarChart3 className="h-4 w-4 mr-2" />
                Screener
              </Button>
            </Link> */}

            {role === "admin" && (
              <Link href="/bhavcopy">
                <Button variant="ghost">
                  <FileText className="h-4 w-4 mr-2" />
                  Bhavcopy
                </Button>
              </Link>
            )}

            {/* Protected UI */}
            {isAuthenticated && isSubscribed && (
              <Link href="/watchlist">
                <Button variant="ghost">
                  <FileText className="h-4 w-4 mr-2" />
                  Watchlist
                </Button>
              </Link>
            )}
            {isAuthenticated && isSubscribed && (
              <Link href="/company/formula">
                <Button variant="ghost">
                  <Calculator className="h-4 w-4 mr-2" />
                  Formulas
                </Button>
              </Link>
            )}

            {<Link href="/master">
                <Button variant="ghost">
                  <Calculator className="h-4 w-4 mr-2" />
                  Logs
                </Button>
              </Link>}

            {/* Auth Button */}
            {!isAuthenticated ? (
              <Link href="/login">
                <Button>
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            ) : (
              <Button variant="destructive" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;