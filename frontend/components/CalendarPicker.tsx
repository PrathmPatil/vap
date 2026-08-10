"use client";

import { DatePicker } from "@/components/ui/date-picker";

interface CalendarPickerProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}

export default function CalendarPicker({
  selectedDate,
  setSelectedDate,
  placeholder = "Pick a date",
  className,
  clearable = false,
}: CalendarPickerProps) {
  return (
    <DatePicker
      value={selectedDate}
      onChange={setSelectedDate}
      placeholder={placeholder}
      className={className}
      clearable={clearable}
    />
  );
}
