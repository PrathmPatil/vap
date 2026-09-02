"use client";

import { Badge } from "@/components/ui/badge";
import type {
  FormulaExploreCategory,
  FormulaExploreItem,
} from "@/lib/formulaExploreCatalog";
import { ChevronRight, Crown } from "lucide-react";

type FormulaExploreCatalogProps = {
  grouped: {
    category: FormulaExploreCategory;
    items: FormulaExploreItem[];
  }[];
  onSelect: (value: string) => void;
};

export default function FormulaExploreCatalog({
  grouped,
  onSelect,
}: FormulaExploreCatalogProps) {
  if (!grouped.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        No screens match your search.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {grouped.map(({ category, items }) => (
        <section key={category.id}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {category.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{category.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSelect(item.value)}
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">
                    {item.label}
                  </h3>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                </div>

                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {item.shortDescription}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.premium ? (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50">
                      <Crown className="mr-1 h-3 w-3" />
                      Premium
                    </Badge>
                  ) : null}
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
