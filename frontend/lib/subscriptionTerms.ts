export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

/** Terms inspired by common Indian market-data platforms (Chartink, Screener.in, TradingView-style disclaimers). */
export const SUBSCRIPTION_TERMS: TermsSection[] = [
  {
    id: "introduction",
    title: "1. Introduction & Acceptance",
    paragraphs: [
      'These Terms & Conditions ("Terms") govern your access to and use of TrendTraders Premium Scanner, watchlist alerts, and related subscription features ("Premium Services") offered through trendtraders.in and associated applications ("Platform").',
      "By checking the acceptance box and activating a subscription, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not subscribe or use Premium Services.",
    ],
  },
  {
    id: "service",
    title: "2. Description of Premium Services",
    paragraphs: [
      "Premium Services provide market scanners, technical signal screens, export tools, saved scans, and optional alert delivery based on exchange-published data and internally computed indicators.",
    ],
    bullets: [
      "Access to Premium Scanner screens (Action Day, RS Rank, volume breakouts, and related scanners)",
      "Historical scan results and Excel/CSV export where enabled",
      "Custom and saved scan configurations (as available on your plan)",
      "Email or WhatsApp alerts for saved scans (where configured)",
    ],
  },
  {
    id: "not-advice",
    title: "3. Not Investment Advice",
    paragraphs: [
      "TrendTraders is a technology platform for market data analysis and screening. We are not a SEBI-registered investment adviser, research analyst, or broker.",
      "All content, scanners, signals, rankings, and alerts are provided for informational and educational purposes only. They do not constitute buy/sell/hold recommendations, portfolio advice, or an offer to transact in any security.",
      "You alone are responsible for evaluating the merits and risks of any investment decision. Consult a qualified financial adviser before acting on market information.",
    ],
  },
  {
    id: "market-data",
    title: "4. Market Data, Accuracy & Delays",
    paragraphs: [
      "Price, volume, corporate action, and fundamental data may be sourced from NSE, BSE, exchange bhavcopy files, third-party vendors, and public filings. Data may be delayed, incomplete, revised, or contain errors.",
      "Scanner results depend on the inputs, thresholds, and trading session date you select. Past signals do not guarantee future performance. Intraday and end-of-day values can change after corporate actions, splits, bonuses, or exchange corrections.",
      "We do not warrant uninterrupted service, real-time accuracy, or fitness for a particular trading strategy.",
    ],
  },
  {
    id: "subscription",
    title: "5. Subscription, Billing & Access",
    paragraphs: [
      "Premium access is granted for the plan period selected at checkout (monthly or annual, as displayed on the subscription page). Fees are quoted in Indian Rupees (INR) unless stated otherwise.",
      "Subscription fees are charged in advance. Your account will be marked active upon successful payment or manual activation by TrendTraders (during promotional or trial periods).",
      "We may change plan features or pricing for future billing cycles with reasonable notice. Continued use after a price change constitutes acceptance of the new fees for subsequent renewals.",
      "Accounts are personal and non-transferable. Sharing login credentials or redistributing scan output for commercial resale is prohibited.",
    ],
  },
  {
    id: "cancellation",
    title: "6. Cancellation, Refunds & Suspension",
    paragraphs: [
      "You may cancel auto-renewal at any time before the next billing date. Access continues until the end of the paid period unless otherwise stated.",
      "Except where required by applicable law, subscription fees are non-refundable once the billing period has started, including partial-month or partial-year usage.",
      "We may suspend or terminate Premium access for violation of these Terms, abuse of the Platform, automated scraping, or conduct that harms other users or exchange data providers.",
    ],
  },
  {
    id: "user-obligations",
    title: "7. Your Responsibilities",
    bullets: [
      "Provide accurate registration details and keep your password secure",
      "Use the Platform only for lawful personal or internal business research",
      "Not reverse engineer, scrape at scale, or resell Platform data or scans",
      "Not rely solely on Platform output for leveraged, intraday, or F&O decisions without independent verification",
      "Comply with NSE/BSE and applicable Indian securities laws when using market data",
    ],
    paragraphs: [],
  },
  {
    id: "ip",
    title: "8. Intellectual Property",
    paragraphs: [
      "TrendTraders logos, scanner logic, UI, and proprietary datasets (excluding underlying exchange data) remain our intellectual property. You receive a limited, revocable, non-exclusive license to use Premium Services during an active subscription.",
      "Exchange trademarks and raw market data remain the property of the respective exchanges and licensors.",
    ],
  },
  {
    id: "liability",
    title: "9. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, TrendTraders and its founders, employees, and partners shall not be liable for any trading losses, lost profits, indirect, incidental, or consequential damages arising from use of or inability to use Premium Services.",
      "Our aggregate liability for any claim relating to Premium Services shall not exceed the subscription fees paid by you in the twelve (12) months preceding the claim.",
    ],
  },
  {
    id: "law",
    title: "10. Governing Law & Disputes",
    paragraphs: [
      "These Terms are governed by the laws of India. Courts at Mumbai, Maharashtra shall have exclusive jurisdiction, subject to mandatory consumer protection remedies available under applicable law.",
      "We may update these Terms from time to time. Material changes will be posted on the Platform; continued use after posting constitutes acceptance.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact",
    paragraphs: [
      "For billing, subscription, or Terms questions, contact support@trendtraders.in with your registered email and account details.",
    ],
  },
];

export const PREMIUM_PLANS = [
  {
    id: "monthly",
    name: "Premium Monthly",
    price: "₹499",
    period: "/ month",
    highlight: false,
    features: [
      "Full Premium Scanner access",
      "All system scanners & filters",
      "Excel export",
      "Watchlist integration",
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    price: "₹3,999",
    period: "/ year",
    highlight: true,
    badge: "Save ~33%",
    features: [
      "Everything in Monthly",
      "Custom scanner saves",
      "Priority scan refresh",
      "Best value for active traders",
    ],
  },
] as const;
