"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  Bookmark,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  Crown,
  CreditCard,
  Database,
  FileText,
  LogIn,
  LogOut,
  Menu,
  Newspaper,
  ScanSearch,
  ScrollText,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { hasMasterAccess } from "@/lib/authRoles";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

type NavLinkItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
  badge?: React.ReactNode;
};

type NavSection = {
  id: string;
  label: string;
  items: NavLinkItem[];
};

function Navigation() {
  const router = useRouter();
  const pathname = router.pathname || "";
  const { isAuthenticated, role, isSubscribed, logout } = useAuth();
  const scannerHref =
    isAuthenticated && isSubscribed ? "/company/formula" : "/subscription";

  const isActive = (href: string, match?: NavLinkItem["match"]) => {
    if (match) return match(pathname);
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navClass = (active: boolean) =>
    cn(
      "font-medium",
      active
        ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    );

  const dropdownItemClass = (href: string, match?: NavLinkItem["match"]) =>
    cn(
      "flex cursor-pointer items-center gap-2",
      isActive(href, match) && "bg-slate-100 font-medium text-slate-900",
    );

  const sectionActive = (items: NavLinkItem[]) =>
    items.some((item) => isActive(item.href, item.match));

  const marketItems: NavLinkItem[] = [
    { href: "/news", label: "News", icon: Newspaper },
    { href: "/listed-companies", label: "Listed Companies", icon: Building2 },
    { href: "/ipo", label: "IPO", icon: FileText },
  ];

  const premiumItems: NavLinkItem[] = [
    ...(isAuthenticated
      ? [{ href: "/subscription", label: "My Subscription", icon: CreditCard }]
      : []),
    ...(isAuthenticated && isSubscribed
      ? [{ href: "/explore", label: "Explore", icon: Compass }]
      : []),
    {
      href: scannerHref,
      label: "Scanner",
      icon: ScanSearch,
      match: (path) =>
        path.startsWith("/company/formula") || path === "/subscription",
      badge: (
        <Badge className="ml-auto border-amber-200 bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-900 hover:bg-amber-100">
          <Crown className="mr-0.5 h-3 w-3" />
          Premium
        </Badge>
      ),
    },
    ...(isAuthenticated && isSubscribed
      ? [{ href: "/watchlist", label: "Watchlist", icon: Bookmark }]
      : []),
  ];

  const adminItems: NavLinkItem[] = [
    ...(role === "admin"
      ? [{ href: "/bhavcopy", label: "Bhavcopy", icon: Database }]
      : []),
    ...(role === "admin" || role === "master" || hasMasterAccess(role)
      ? [
          {
            href: "/master/data-coverage",
            label: "Data Coverage",
            icon: CalendarDays,
          },
          { href: "/master", label: "Logs", icon: ScrollText },
        ]
      : []),
  ];

  const sections: NavSection[] = [
    { id: "markets", label: "Markets", items: marketItems },
    { id: "premium", label: "Premium", items: premiumItems },
    ...(adminItems.length
      ? [{ id: "admin", label: "Admin", items: adminItems }]
      : []),
  ];

  const renderDropdownSection = (section: NavSection) => {
    const active = sectionActive(section.items);
    return (
      <DropdownMenu key={section.id}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={navClass(active)}>
            {section.label}
            <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={dropdownItemClass(item.href, item.match)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMobileSection = (section: NavSection) => (
    <div key={section.id} className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {section.label}
      </p>
      {section.items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.href, item.match)
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.badge}
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
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
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/">
                <Button variant="ghost" className={navClass(isActive("/"))}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              {sections.map(renderDropdownSection)}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <Link
                    href="/"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive("/")
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Link>

                  {sections.map(renderMobileSection)}
                </div>
              </SheetContent>
            </Sheet>

            {!isAuthenticated ? (
              <Link href="/login">
                <Button>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </Link>
            ) : (
              <>
                <NotificationBell />
                <Button variant="destructive" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
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
