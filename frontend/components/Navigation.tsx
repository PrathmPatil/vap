"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  FileText,
  LogOut,
  LogIn,
  Calculator,
  Building2,
  Newspaper,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { hasMasterAccess } from "@/lib/authRoles";
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

function Navigation() {
  const router = useRouter();
  const pathname = router.pathname || "";
  const { isAuthenticated, role, isSubscribed = true, logout } = useAuth();

  const isActive = (href: string, match?: NavItem["match"]) => {
    if (match) return match(pathname);
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navClass = (href: string, match?: NavItem["match"]) =>
    cn(
      "font-medium",
      isActive(href, match)
        ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    );

  const items: NavItem[] = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/news", label: "News", icon: Newspaper },
    { href: "/listed-companies", label: "Listed Companies", icon: Building2 },
    { href: "/ipo", label: "IPO", icon: FileText },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="TrendTraders"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-xl font-bold text-slate-900">
              TrendTraders
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" className={navClass(item.href, item.match)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {role === "admin" && (
                <Link href="/bhavcopy">
                  <Button variant="ghost" className={navClass("/bhavcopy")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Bhavcopy
                  </Button>
                </Link>
              )}

              {isAuthenticated && isSubscribed && (
                <Link href="/watchlist">
                  <Button variant="ghost" className={navClass("/watchlist")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Watchlist
                  </Button>
                </Link>
              )}

              {isAuthenticated && isSubscribed && (
                <Link href="/company/formula">
                  <Button
                    variant="ghost"
                    className={navClass("/company/formula", (path) =>
                      path.startsWith("/company/formula"),
                    )}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Formulas
                  </Button>
                </Link>
              )}

              {(role === "admin" || role === "master" || hasMasterAccess(role)) && (
                <Link href="/master">
                  <Button variant="ghost" className={navClass("/master")}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Logs
                  </Button>
                </Link>
              )}
            </div>

            {!isAuthenticated ? (
              <Link href="/login">
                <Button>
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            ) : (
              <>
                <NotificationBell />
                <Button variant="destructive" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
