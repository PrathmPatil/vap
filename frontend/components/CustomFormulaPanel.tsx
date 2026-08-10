"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCustomFormula,
  deleteCustomFormula,
  listCustomFormulas,
  runCustomFormula,
  updateCustomFormula,
} from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { exportRowsToCsv } from "@/lib/exportData";
import {
  FORMULA_ALLOWED_VARS,
  FORMULA_OPERATORS,
  checkExpression,
  loadCachedFormulas,
  saveCachedFormulas,
} from "@/lib/expressionValidator";
import { CheckCircle2, Pencil, Play, Plus, Trash2, XCircle } from "lucide-react";

type CustomFormula = {
  id: number;
  name: string;
  slug: string;
  expression: string;
  description?: string | null;
  is_active?: boolean;
};

const EXAMPLE = "rsi14 < 30 and close > sma20 and volume > 100000";

export default function CustomFormulaPanel({
  onRunResults,
}: {
  onRunResults: (payload: {
    columns: any[];
    data: any[];
    totalPages: number;
    totalItems: number;
    title: string;
    formulaName?: string;
    asOf?: string;
  }) => void;
}) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const userKey = user?.id ?? user?.email ?? null;
  const [items, setItems] = useState<CustomFormula[]>([]);
  const [allowedVars, setAllowedVars] = useState<string[]>([
    ...FORMULA_ALLOWED_VARS,
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [expression, setExpression] = useState(EXAMPLE);
  const [description, setDescription] = useState("");
  const expressionRef = useRef<HTMLInputElement | null>(null);

  const expressionCheck = useMemo(
    () => checkExpression(expression),
    [expression]
  );

  const applyItems = (next: CustomFormula[], persistCache = true) => {
    setItems(next);
    if (persistCache) saveCachedFormulas(userKey, next);
  };

  const load = async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    const cached = loadCachedFormulas(userKey);
    if (cached?.length) {
      setItems(cached as CustomFormula[]);
    }

    setLoading(true);
    setError(null);
    try {
      const res = await listCustomFormulas();
      const rows = Array.isArray(res?.data) ? res.data : [];
      applyItems(rows, true);
      if (Array.isArray(res?.allowed_vars) && res.allowed_vars.length) {
        setAllowedVars(res.allowed_vars);
      }
    } catch (e: any) {
      if (!cached?.length) {
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load saved formulas"
        );
      } else {
        setSuccess("Showing locally cached formulas (server sync pending).");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, userKey]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setExpression(EXAMPLE);
    setDescription("");
    setError(null);
    setSuccess(null);
  };

  const insertAtCursor = (snippet: string) => {
    const el = expressionRef.current;
    if (!el) {
      setExpression((prev) => `${prev}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    const next =
      expression.slice(0, start) + snippet + expression.slice(end);
    setExpression(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!expression.trim()) {
      setError("Expression is required");
      return;
    }
    if (!expressionCheck.valid) {
      setError(`Fix expression first: ${expressionCheck.message}`);
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const res = await updateCustomFormula(editingId, {
          name: name.trim(),
          expression: expression.trim(),
          description: description.trim(),
        });
        const updated = res?.data;
        applyItems(
          items.map((item) =>
            item.id === editingId ? { ...item, ...(updated || {}) } : item
          ),
          true
        );
        setSuccess("Formula updated and saved for long-term use.");
      } else {
        const res = await createCustomFormula({
          name: name.trim(),
          expression: expression.trim(),
          description: description.trim(),
        });
        const created = res?.data;
        if (created) {
          applyItems([created, ...items.filter((i) => i.id !== created.id)], true);
        } else {
          await load();
        }
        setSuccess("Formula saved permanently to your account.");
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: CustomFormula) => {
    setEditingId(item.id);
    setName(item.name);
    setExpression(item.expression);
    setDescription(item.description || "");
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this custom formula permanently?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCustomFormula(id);
      applyItems(
        items.filter((item) => item.id !== id),
        true
      );
      if (editingId === id) resetForm();
      setSuccess("Formula deleted.");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (id: number, formulaName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runCustomFormula(id, { page: 1, pageSize: 50 });
      const rows = res?.data || [];
      const columns = rows.length
        ? Object.keys(rows[0])
            .filter((k) => {
              const key = k.toLowerCase();
              return ![
                "id",
                "trade_date",
                "tradedate",
                "created_at",
                "updated_at",
                "createdat",
                "updatedat",
              ].includes(key);
            })
            .map((key) => ({
              key,
              label: key.replace(/_/g, " ").toUpperCase(),
              sortable: true,
            }))
        : [];
      onRunResults({
        columns,
        data: rows,
        totalPages: res?.pages || 1,
        totalItems: res?.total || 0,
        title: `Custom: ${formulaName} (${res?.as_of || ""})`,
        formulaName,
        asOf: res?.as_of || undefined,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Run failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Loading saved formulas…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Login to create and keep custom formulas permanently on your account.
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            My Custom Formulas
          </h2>
          <p className="text-sm text-slate-500">
            Saved to your account (and cached locally). Example:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">{EXAMPLE}</code>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Oversold bounce"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Expression *
          </label>
          <Input
            ref={expressionRef}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className={`font-mono text-sm ${
              expression.trim()
                ? expressionCheck.valid
                  ? "border-emerald-400 focus-visible:ring-emerald-300"
                  : "border-red-400 focus-visible:ring-red-300"
                : ""
            }`}
            placeholder={EXAMPLE}
          />
          <div
            className={`flex items-start gap-2 text-xs ${
              expressionCheck.valid ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {expressionCheck.valid ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{expressionCheck.message}</span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <p className="text-xs font-medium text-slate-600">Insert field</p>
          <div className="flex flex-wrap gap-1.5">
            {allowedVars.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => insertAtCursor(field)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100"
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <p className="text-xs font-medium text-slate-600">Insert operator</p>
          <div className="flex flex-wrap gap-1.5">
            {FORMULA_OPERATORS.map((op) => (
              <button
                key={op.label}
                type="button"
                onClick={() => insertAtCursor(op.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !expressionCheck.valid || !name.trim()}
          >
            {editingId ? "Update & save permanently" : "Save permanently"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Expression</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  {loading ? "Loading…" : "No custom formulas saved yet."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">
                    {item.expression}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Run"
                        onClick={() => handleRun(item.id, item.name)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Edit"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          exportRowsToCsv(
                            [{ name: item.name, expression: item.expression }],
                            {
                              filename: `${item.slug}_${new Date()
                                .toISOString()
                                .slice(0, 10)}.csv`,
                            }
                          )
                        }
                      >
                        Export
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
