'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col space-y-3',
        month: 'space-y-3',
        caption: 'relative flex items-center justify-center px-8 pt-1',
        caption_label: 'text-sm font-semibold text-slate-900',
        nav: 'flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 rounded-md bg-white p-0 text-slate-600 opacity-80 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-[252px] border-collapse',
        head_row: 'flex w-[252px]',
        head_cell:
          'flex h-8 w-9 items-center justify-center text-[0.7rem] font-medium text-slate-400',
        row: 'mt-1 flex w-[252px]',
        cell: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 rounded-md p-0 font-normal text-slate-800 hover:bg-slate-100'
        ),
        day_selected:
          '!bg-slate-900 !text-white hover:!bg-slate-900 hover:!text-white focus:!bg-slate-900 focus:!text-white',
        day_today: 'ring-1 ring-inset ring-slate-300 font-semibold aria-selected:!ring-0',
        day_outside: 'text-slate-300 opacity-60',
        day_disabled: 'text-slate-300 opacity-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
