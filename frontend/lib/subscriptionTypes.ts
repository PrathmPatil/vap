export type SubscriptionRecord = {
  id: number;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  priceLabel: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  daysRemaining: number;
  isActive: boolean;
};

export type SubscriptionPlan = {
  id: "monthly" | "yearly";
  name: string;
  price: string;
  period: string;
  amount: number;
  currency: string;
  highlight: boolean;
  badge: string | null;
  features: string[];
  isCurrent: boolean;
};

export type SubscriptionDetailsResponse = {
  success: boolean;
  user?: {
    email?: string;
    username?: string;
    is_subscribed?: boolean;
  };
  isSubscribed?: boolean;
  current?: SubscriptionRecord | null;
  history?: SubscriptionRecord[];
  plans?: SubscriptionPlan[];
  message?: string;
};
