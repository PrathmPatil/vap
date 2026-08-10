"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  createUserScan,
  deleteUserScan,
  listUserScans,
  runUserScan,
  updateUserScan,
} from "@/utils";
import { FORMULA_CATALOG } from "@/lib/formulaCatalog";

type ScanRow = {
  id: number;
  name: string;
  formula_type: string;
  base_percent?: number | null;
  change_percent_min?: number | null;
  change_percent_max?: number | null;
  change_sort?: string;
  symbol?: string | null;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  alert_email?: string | null;
  alert_whatsapp?: string | null;
  last_match_count?: number | null;
  last_trade_date?: string | null;
  last_notified_at?: string | null;
  is_active?: boolean;
};

type Props = {
  formulaType: string;
  basePercent: number;
  changePercentMin: string;
  changePercentMax: string;
  changeSort: "asc" | "desc";
  selectedSymbol: string;
};

export default function MyScanPanel({
  formulaType,
  basePercent,
  changePercentMin,
  changePercentMax,
  changeSort,
  selectedSymbol,
}: Props) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [name, setName] = useState("Strong bullish scan");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [alertEmail, setAlertEmail] = useState(user?.email || "");
  const [alertWhatsapp, setAlertWhatsapp] = useState(
    user?.whatsappNumber || user?.phoneNumber || ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!isAuthenticated) {
      setScans([]);
      return;
    }
    const response = await listUserScans();
    setScans(response?.data || []);
  };

  useEffect(() => {
    if (authLoading) return;
    load().catch(() => setScans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (user?.email && !alertEmail) setAlertEmail(user.email);
    if ((user?.whatsappNumber || user?.phoneNumber) && !alertWhatsapp) {
      setAlertWhatsapp(user.whatsappNumber || user.phoneNumber || "");
    }
  }, [user, alertEmail, alertWhatsapp]);

  const saveScan = async () => {
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError("Enter a scan name");
      return;
    }
    setLoading(true);
    try {
      await createUserScan({
        name: name.trim(),
        formula_type: formulaType,
        base_percent: basePercent,
        change_percent_min: changePercentMin === "" ? null : Number(changePercentMin),
        change_percent_max: changePercentMax === "" ? null : Number(changePercentMax),
        change_sort: changeSort,
        symbol: selectedSymbol || null,
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
        alert_email: alertEmail || null,
        alert_whatsapp: alertWhatsapp || null,
      });
      setMessage("Scan saved.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save scan");
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (scan: ScanRow, field: "notify_email" | "notify_whatsapp") => {
    await updateUserScan(scan.id, { [field]: !scan[field] });
    await load();
  };

  const runScan = async (scan: ScanRow) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const response = await runUserScan(scan.id, { notify: true });
      const count = response?.result?.totalItems ?? 0;
      const deliveries = response?.notification?.deliveries || [];
      const channels = deliveries
        .map((item: { channel: string; status: string }) => `${item.channel}: ${item.status}`)
        .join(", ");
      setMessage(
        channels
          ? `${scan.name}: ${count} matches. ${channels}`
          : `${scan.name}: ${count} matches.`
      );
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to run scan");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        Login to save My Scan alerts on Email or WhatsApp.
      </div>
    );
  }

  const formulaLabel =
    FORMULA_CATALOG.find((item) => item.value === formulaType)?.label || formulaType;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Save current scan</h3>
        <p className="mt-1 text-xs text-slate-500">
          Uses {formulaLabel}, threshold {basePercent}%
          {selectedSymbol ? `, symbol ${selectedSymbol}` : ""}.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Scan name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Alert email</label>
            <Input
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">WhatsApp number</label>
            <Input
              value={alertWhatsapp}
              onChange={(e) => setAlertWhatsapp(e.target.value)}
              placeholder="91XXXXXXXXXX"
            />
          </div>
          <div className="flex items-end gap-4 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
              />
              Email alert
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
              />
              WhatsApp alert
            </label>
          </div>
        </div>

        <div className="mt-4">
          <Button type="button" onClick={saveScan} disabled={loading}>
            Save My Scan
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Scan</th>
              <th className="px-3 py-2 font-medium">Alerts</th>
              <th className="px-3 py-2 font-medium">Last run</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  No saved scans yet.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr key={scan.id} className="border-t">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">{scan.name}</div>
                    <div className="text-xs text-slate-500">
                      {scan.formula_type} · {scan.base_percent}%
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 ${
                          scan.notify_email
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                        onClick={() => toggleChannel(scan, "notify_email")}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 ${
                          scan.notify_whatsapp
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                        onClick={() => toggleChannel(scan, "notify_whatsapp")}
                      >
                        WhatsApp
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {scan.last_match_count != null
                      ? `${scan.last_match_count} matches`
                      : "—"}
                    {scan.last_trade_date ? ` · ${String(scan.last_trade_date).slice(0, 10)}` : ""}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => runScan(scan)}
                      >
                        Run + notify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deleteUserScan(scan.id);
                          await load();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
