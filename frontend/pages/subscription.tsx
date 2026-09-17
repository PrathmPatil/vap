"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import SubscriptionAccount from "@/components/SubscriptionAccount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { activateSubscription } from "@/utils";
import {
  PREMIUM_PLANS,
  SUBSCRIPTION_TERMS,
} from "@/lib/subscriptionTerms";
import {
  Check,
  Crown,
  Loader2,
  ScanSearch,
  Shield,
  Sparkles,
} from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated, authLoading, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const termsRef = useRef<HTMLDivElement>(null);

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

    if (!isAuthenticated) {
      router.push(
        `/login?returnUrl=${encodeURIComponent("/subscription")}`,
      );
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
        router.replace("/subscription");
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <PageLoader inline message="Loading subscription…" />
        </main>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/20">
        <Navigation />
        <SubscriptionAccount />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100">
      <Navigation />

      <main className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-10 text-center">
          <Badge className="mb-4 border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
            <Crown className="mr-1 h-3.5 w-3.5" />
            Premium Scanner
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Unlock TrendTraders Premium
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Screen the market with Action Day, RS Rank, volume breakouts, and
            advanced filters — built for serious Indian equity research.
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {PREMIUM_PLANS.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
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

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  Premium Scanner includes
                </p>
                <p className="text-sm text-slate-600">
                  Action Day signals, IBD-style RS Rank, King Candle filters,
                  volume breakout screens, exports, and more.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="h-4 w-4" />
              Secure account · Cancel anytime
            </div>
          </div>
        </div>

        <div
          ref={termsRef}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Terms & Conditions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Last updated: 25 August 2026 · Please read before subscribing
            </p>
          </div>

          <div className="max-h-[28rem] overflow-y-auto px-6 py-5">
            <div className="space-y-6 text-sm leading-relaxed text-slate-700">
              {SUBSCRIPTION_TERMS.map((section) => (
                <section key={section.id} id={section.id}>
                  <h3 className="mb-2 font-semibold text-slate-900">
                    {section.title}
                  </h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
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
                I have read and agree to the Terms & Conditions.
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
                    Activating…
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Login to Activate Premium
                  </>
                )}
              </Button>
              <Link
                href={`/login?returnUrl=${encodeURIComponent("/subscription")}`}
                className="text-center text-sm text-slate-500 hover:text-slate-800"
              >
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
