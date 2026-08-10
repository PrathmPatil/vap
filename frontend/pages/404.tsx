import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Navigation />
      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">
            TrendTraders
          </p>

          <h1 className="mt-4 text-7xl font-bold tracking-tight text-slate-900 sm:text-8xl">
            404
          </h1>

          <div className="mx-auto mt-5 h-px w-16 bg-slate-200" />

          <h2 className="mt-5 text-xl font-semibold text-slate-800 sm:text-2xl">
            Page not found
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            The page you are looking for does not exist, was moved, or the link
            may be incorrect.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-slate-900 hover:bg-slate-800">
              <Link href="/">Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/listed-companies">Listed companies</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
