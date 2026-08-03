import Image from "next/image";

type PageLoaderProps = {
  /** Full viewport centered loader */
  fullScreen?: boolean;
  /** Semi-transparent overlay on top of current content (route transitions) */
  overlay?: boolean;
  /** Compact inline block for tables/cards */
  inline?: boolean;
  /** Kept for callers; not shown visually (screen-reader only) */
  message?: string;
  className?: string;
};

export function PageLoader({
  fullScreen = false,
  overlay = false,
  inline = false,
  message = "Loading…",
  className = "",
}: PageLoaderProps) {
  const content = (
    <div
      className={`flex items-center justify-center ${
        inline ? "py-20" : ""
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
        <span className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-blue-600 border-r-blue-500" />
        <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-slate-200 sm:h-20 sm:w-20">
          <Image
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            priority
          />
        </span>
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {content}
      </div>
    );
  }

  if (inline) {
    return (
      <div className="flex w-full items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
        {content}
      </div>
    );
  }

  return content;
}

export default PageLoader;
