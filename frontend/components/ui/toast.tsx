'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

// ✅ Premium Top-Right Layout
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col gap-3 md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// ✅ Premium Glass Variants
const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border px-5 py-4 shadow-xl backdrop-blur-lg transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-5 data-[state=closed]:slide-out-to-right-full',
  {
    variants: {
      variant: {
        default:
          'bg-green-500/10 border-green-500/30 text-green-600',

        success:
          'bg-green-500/10 border-green-500/30 text-green-600',

        destructive:
          'bg-red-500/10 border-red-500/30 text-red-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ✅ Toast Root
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* 🔥 Left Accent Line */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 rounded-l-xl',
          variant === 'success' && 'bg-green-500',
          variant === 'destructive' && 'bg-red-500'
        )}
      />

      {children}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

// ✅ Action Button (Improved)
const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

// ✅ Close Button (Clean + Minimal)
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-700 transition',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

// ✅ Title
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold tracking-tight', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

// ✅ Description
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-80 leading-relaxed', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// ✅ Types
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

// ✅ Export
export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};