export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Premium Monthly',
    amount: 499,
    currency: 'INR',
    periodLabel: '/ month',
    periodDays: 30,
    features: [
      'Full Premium Scanner access',
      'All system scanners & filters',
      'Excel export',
      'Watchlist integration',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Premium Yearly',
    amount: 3999,
    currency: 'INR',
    periodLabel: '/ year',
    periodDays: 365,
    badge: 'Save ~33%',
    highlight: true,
    features: [
      'Everything in Monthly',
      'Custom scanner saves',
      'Priority scan refresh',
      'Best value for active traders',
    ],
  },
};

export function getPlanConfig(planId) {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.yearly;
}

export function listPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function addPeriodDays(startDate, planId) {
  const plan = getPlanConfig(planId);
  const expires = new Date(startDate);
  expires.setDate(expires.getDate() + plan.periodDays);
  return expires;
}

export function formatPlanPrice(plan) {
  return `₹${plan.amount.toLocaleString('en-IN')}`;
}
