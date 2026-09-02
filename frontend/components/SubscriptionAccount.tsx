"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { activateSubscription, getSubscriptionDetails } from "@/utils";
import { SUBSCRIPTION_TERMS } from "@/lib/subscriptionTerms";
import type {
  SubscriptionDetailsResponse,
  SubscriptionPlan,
  SubscriptionRecord,
} from "@/lib/subscriptionTypes";
import {
  Bookmark,
  Calendar,
  Check,
  Compass,
  Crown,
  History,
  Loader2,
  RefreshCw,
  ScanSearch,
  Shield,
  Sparkles,
} from "lucide-react";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";
    case "superseded":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "expired":
      return "border-amber-200 bg-amber-100 text-amber-900";
    case "cancelled":
      return "border-red-200 bg-red-100 text-red-900";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function CurrentPlanCard({
  current,
  isSubscribed,
}: {
  current: SubscriptionRecord | null;
  isSubscribed: boolean;
}) {
  if (!isSubscribed || !current) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500 p-2.5 text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              No active subscription
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a plan below to unlock Premium Scanner, Explore, and
              Watchlist.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Current plan: {current.planName}
              </h2>
              <Badge className={statusBadgeClass(current.status)}>
                {current.status}
              </Badge>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {current.priceLabel}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Started {formatDate(current.startedAt)}
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Renews / expires {formatDate(current.expiresAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Days remaining
          </p>
          <p className="text-3xl font-bold text-emerald-900">
            {current.daysRemaining}
          </p>
        </div>
      </div>
    </section>
  );
}

function HistoryTable({ history }: { history: SubscriptionRecord[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <History className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          Subscription history
        </h2>
      </div>

      {history.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          No subscription history yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {row.planName}
                  </td>
                  <td className="px-6 py-3 text-slate-700">{row.priceLabel}</td>
                  <td className="px-6 py-3">
                    <Badge className={statusBadgeClass(row.status)}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {formatDate(row.startedAt)}
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {formatDate(row.expiresAt)}
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AvailablePlans({
  plans,
  selectedPlan,
  onSelect,
}: {
  plans: SubscriptionPlan[];
  selectedPlan: "monthly" | "yearly";
  onSelect: (plan: "monthly" | "yearly") => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900">Available plans</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                active
                  ? "border-amber-500 bg-white shadow-lg shadow-amber-100"
                  : "border-slate-200 bg-white/80 hover:border-slate-300"
              }`}
            >
              {plan.highlight && plan.badge ? (
                <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              ) : null}
              {plan.isCurrent ? (
                <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Current plan
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {plan.price}
                    <span className="text-base font-normal text-slate-500">
                      {plan.period}
                    </span>
                  </p>
                </div>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {active ? <Check className="h-4 w-4" /> : null}
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function SubscriptionAccount() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetailsResponse | null>(
    null,
  );
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const termsRef = useRef<HTMLDivElement>(null);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = (await getSubscriptionDetails()) as SubscriptionDetailsResponse;
      if (!response?.success) {
        throw new Error(response?.message || "Unable to load subscription");
      }
      setDetails(response);
      if (response.current?.planId === "monthly") {
        setSelectedPlan("monthly");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load subscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const scrollToTerms = () => {
    termsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubscribe = async () => {
    setError("");
    if (!acceptedTerms) {
      setError("Please read and accept the Terms & Conditions to continue.");
      scrollToTerms();
      return;
    }

    setSubmitting(true);
    try {
      const response = await activateSubscription({
        acceptTerms: true,
        plan: selectedPlan,
      });
      if (response?.success) {
        await refreshUser();
        await loadDetails();
        setAcceptedTerms(false);
        return;
      }
      throw new Error(response?.message || "Subscription failed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to activate subscription";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4 py-10">
        <PageLoader inline message="Loading your subscription…" />
      </main>
    );
  }

  const user = details?.user;
  const isSubscribed = Boolean(details?.isSubscribed);
  const current = details?.current ?? null;
  const history = details?.history ?? [];
  const plans = details?.plans ?? [];

  const premiumLinks = [
    { href: "/company/formula", label: "Premium Scanner", icon: ScanSearch },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  ];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge className="mb-3 border-indigo-200 bg-indigo-100 text-indigo-900 hover:bg-indigo-100">
            My Subscription
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Subscription account
          </h1>
          <p className="mt-2 text-slate-600">
            {user?.username || user?.email
              ? `Signed in as ${user.username || user.email}`
              : "Manage your Premium membership, history, and plans."}
          </p>
        </div>
        <Button variant="outline" onClick={loadDetails} disabled={submitting}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="space-y-8">
        <CurrentPlanCard current={current} isSubscribed={isSubscribed} />

        {isSubscribed ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Premium access
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {premiumLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <Icon className="h-4 w-4 text-indigo-600" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <HistoryTable history={history} />

        <AvailablePlans
          plans={plans}
          selectedPlan={selectedPlan}
          onSelect={setSelectedPlan}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-slate-500" />
            <div>
              <h2 className="font-semibold text-slate-900">
                {isSubscribed ? "Renew or change plan" : "Activate Premium"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isSubscribed
                  ? "Select a plan below to renew early or switch billing cycle. Your previous active plan will move to history."
                  : "Accept the terms and activate Premium to unlock all scanners and tools."}
              </p>
            </div>
          </div>
        </section>

        <div
          ref={termsRef}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Terms & Conditions
            </h2>
          </div>
          <div className="max-h-72 overflow-y-auto px-6 py-5">
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              {SUBSCRIPTION_TERMS.slice(0, 4).map((section) => (
                <section key={section.id}>
                  <h3 className="mb-1 font-semibold text-slate-900">
                    {section.title}
                  </h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-5">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(checked) =>
                  setAcceptedTerms(checked === true)
                }
                className="mt-0.5"
              />
              <span className="text-sm text-slate-700">
                I agree to the Terms & Conditions for this subscription.
              </span>
            </label>
            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={submitting}
                onClick={handleSubscribe}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : isSubscribed ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {selectedPlan === current?.planId
                      ? "Renew plan"
                      : "Switch plan"}
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Activate Premium (
                    {selectedPlan === "yearly" ? "Yearly" : "Monthly"})
                  </>
                )}
              </Button>
              <Link
                href="/"
                className="text-center text-sm text-slate-500 hover:text-slate-800"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
