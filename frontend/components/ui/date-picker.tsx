"use client";

import * as React from "react";
import {
  addMonths,
  format,
  isValid,
  parse,
  setMonth,
  setYear,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  align?: "start" | "center" | "end";
  fromDate?: Date;
  toDate?: Date;
  id?: string;
  "aria-label"?: string;
};

type PickerView = "day" | "month" | "year";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseYmd(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function decadeStart(year: number) {
  return Math.floor(year / 12) * 12;
}

function sameMonthDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  clearable = false,
  align = "start",
  fromDate,
  toDate,
  id,
  "aria-label": ariaLabel = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<PickerView>("day");
  const selected = React.useMemo(() => parseYmd(value), [value]);

  const minYear = fromDate?.getFullYear() ?? 1990;
  const maxYear = toDate?.getFullYear() ?? new Date().getFullYear() + 1;
  const minMonth = fromDate?.getMonth() ?? 0;
  const maxMonth = toDate?.getMonth() ?? 11;

  const [month, setMonthView] = React.useState<Date>(() => selected ?? new Date());
  const [yearPage, setYearPage] = React.useState(() =>
    decadeStart((selected ?? new Date()).getFullYear()),
  );

  // Depend on the string value — never a Date object (new Date each render = loop).
  React.useEffect(() => {
    if (!value) return;
    const next = parseYmd(value);
    if (!next) return;

    setMonthView((prev) => (sameMonthDay(prev, next) ? prev : next));
    setYearPage(decadeStart(next.getFullYear()));
  }, [value]);

  React.useEffect(() => {
    if (!open) setView("day");
  }, [open]);

  const handleSelect = (date?: Date) => {
    onChange?.(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.("");
  };

  const handleMonthChange = React.useCallback((next: Date) => {
    setMonthView((prev) =>
      prev.getFullYear() === next.getFullYear() &&
      prev.getMonth() === next.getMonth()
        ? prev
        : next,
    );
  }, []);

  const changeMonth = (next: Date) => {
    const floor = new Date(minYear, minMonth, 1);
    const ceil = new Date(maxYear, maxMonth, 1);
    if (next < floor || next > ceil) return;
    handleMonthChange(next);
  };

  const yearCards = Array.from({ length: 12 }, (_, index) => yearPage + index).filter(
    (year) => year >= minYear && year <= maxYear,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-10 min-w-[220px] justify-start gap-2 rounded-lg border-slate-300 bg-white px-3 font-normal text-slate-900 shadow-sm hover:bg-slate-50",
            !selected && "text-slate-500",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="flex-1 truncate text-left">
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </span>
          {clearable && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="w-[300px] overflow-hidden rounded-xl border-slate-200 p-0 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Select date
          </p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            {selected ? format(selected, "EEE, MMM d, yyyy") : placeholder}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 pt-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-md"
            aria-label={view === "year" ? "Previous years" : "Previous month"}
            onClick={() => {
              if (view === "year") {
                setYearPage((page) => Math.max(minYear, page - 12));
              } else {
                changeMonth(subMonths(month, 1));
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            className={cn(
              "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 hover:bg-slate-50",
              view === "month" &&
                "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
            )}
            onClick={() =>
              setView((current) => (current === "month" ? "day" : "month"))
            }
          >
            {format(month, "MMM")}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          <button
            type="button"
            className={cn(
              "inline-flex h-8 w-[5.75rem] shrink-0 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 hover:bg-slate-50",
              view === "year" &&
                "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
            )}
            onClick={() => {
              setYearPage(decadeStart(month.getFullYear()));
              setView((current) => (current === "year" ? "day" : "year"));
            }}
          >
            {month.getFullYear()}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-md"
            aria-label={view === "year" ? "Next years" : "Next month"}
            onClick={() => {
              if (view === "year") {
                setYearPage((page) => Math.min(Math.max(minYear, maxYear - 11), page + 12));
              } else {
                changeMonth(addMonths(month, 1));
              }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {view === "month" ? (
          <div className="grid grid-cols-3 gap-2 p-3">
            {MONTHS_SHORT.map((label, index) => {
              const active = month.getMonth() === index;
              return (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    "rounded-lg border px-2 py-3 text-sm font-medium transition-colors",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    changeMonth(setMonth(month, index));
                    setView("day");
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {view === "year" ? (
          <div className="p-3">
            <p className="mb-2 text-center text-xs font-medium text-slate-500">
              {yearCards[0]} – {yearCards[yearCards.length - 1]}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {yearCards.map((year) => {
                const active = month.getFullYear() === year;
                return (
                  <button
                    key={year}
                    type="button"
                    className={cn(
                      "rounded-lg border px-2 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                    )}
                    onClick={() => {
                      changeMonth(setYear(month, year));
                      setView("day");
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {view === "day" ? (
          <Calendar
            mode="single"
            month={month}
            onMonthChange={handleMonthChange}
            selected={selected}
            onSelect={handleSelect}
            fromDate={fromDate}
            toDate={toDate}
            disabled={(date) => {
              if (fromDate && date < fromDate) return true;
              if (toDate && date > toDate) return true;
              return false;
            }}
            classNames={{
              caption: "hidden",
              nav: "hidden",
            }}
            className="px-3 pb-1 pt-2"
          />
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-slate-600"
            onClick={() => {
              const today = new Date();
              setMonthView(today);
              setYearPage(decadeStart(today.getFullYear()));
              setView("day");
              handleSelect(today);
            }}
          >
            Today
          </Button>
          {clearable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-slate-600"
              onClick={() => handleSelect(undefined)}
            >
              Clear
            </Button>
          ) : (
            view !== "day" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-slate-600"
                onClick={() => setView("day")}
              >
                Back
              </Button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
