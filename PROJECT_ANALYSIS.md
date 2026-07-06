# VAP Project Analysis

Generated on: 2026-06-14

## Scope

This document is a static analysis of the full repository, split by the three main application areas:

- `frontend`: Next.js user interface.
- `backend`: Node.js/Express API service.
- `python`: FastAPI ingestion, scraping, and scheduler service.

The analysis covers architecture, entry points, data flow, run commands, testing coverage, strengths, risks, and recommended next steps. It is based on source review only. No runtime tests or external integrations were executed while preparing this document.

## Executive Summary

VAP is a financial market data platform. The frontend provides dashboards and tables for market data, companies, IPOs, screeners, news, formulas, watchlists, and admin-style logs. The backend exposes an Express API under `/vap`, backed by Sequelize/MySQL models and formula cron jobs. The Python service is a FastAPI application under root path `/ml`; it performs market data ingestion, scraping, warmups, cron scheduling, and database initialization.

The repository has useful separation by service and feature, but several areas need attention before production hardening:

- Authentication and authorization are incomplete or inconsistent across frontend and backend.
- Some admin or mutating backend routes are public.
- Python startup performs database initialization and scheduler startup with side effects.
- Frontend, backend, and Python READMEs do not yet document the actual project behavior.
- Test coverage is very light: backend has two small tests, while frontend and Python have no visible tests.
- Dependency and config conventions drift across services.

## Repository Layout

```text
vap/
  backend/    Express API, Sequelize models, API routes, cron management
  frontend/   Next.js Pages Router UI, shared UI components, API helpers
  python/     FastAPI ingestion service, external data services, schedulers
```

Other notable repository observations:

- The project currently has many modified files in the working tree, especially around Python database/config startup, backend route/controller updates, and frontend auth/API utilities.
- Several legacy or copy files remain in Python and backend folders, for example `python/app/cron/company_profile_cron copy.py`, `python/app/services/yfinance_service copy.py`, `backend/src/routes/bhavcopyDataRoutescopy.js`, and `backend/src/routes/stockData.routes copy.js`.
- Root-level project documentation was missing before this file. `frontend/README.md` is still the default Next.js template, and `backend/README.md` only contains a minimal title.

## Service Overview

| Service | Framework | Main Entry | Main Port | Main Purpose |
| --- | --- | --- | --- | --- |
| Frontend | Next.js, React, TypeScript | `frontend/pages/_app.tsx` | `3000` by default | User-facing dashboards and workflows |
| Backend | Express, Sequelize, MySQL | `backend/src/index.js` | `APP_PORT` or `8000` | API gateway, auth, formula APIs, MySQL reads/writes |
| Python | FastAPI, PyMySQL/SQLAlchemy, APScheduler | `python/app/main.py` | `8080` in Docker | External data ingestion, scraping, cron jobs |

## Local Commands

### Frontend

From `frontend`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Backend

From `backend`:

```bash
npm run dev
npm start
npm test
npm run test:coverage
npm run lint
npm run build
```

### Python

From `python`, likely commands are:

```bash
python run.py
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

The Python Dockerfile uses:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## Cross-Service Architecture

The intended flow appears to be:

```text
Browser
  -> Next.js frontend
  -> Express backend under /vap
  -> MySQL databases and formula models

Python FastAPI service
  -> external sources such as NSE, BSE, screener, Yahoo Finance, government news, IPO sources
  -> MySQL databases
  -> scheduled ingestion and update jobs
```

The frontend primarily calls the backend through helpers in `frontend/utils/apis.ts` and `frontend/utils/index.ts`. The backend and Python service share financial data concerns through MySQL database ownership and, in some areas, likely service-to-service calls.

## Frontend Analysis

### Overview

The frontend is a Next.js Pages Router app using TypeScript, React 19, Tailwind CSS, Radix UI/shadcn-style components, charts, forms, and custom data hooks.

Important files:

- `frontend/pages/_app.tsx`: wraps the application in `AuthProvider` and renders the shared toaster.
- `frontend/context/AuthContext.tsx`: manages login, registration, logout, local user state, token cookie, and localStorage.
- `frontend/middleware.ts`: redirects unauthenticated users away from protected pages.
- `frontend/utils/apis.ts`: central API wrapper.
- `frontend/utils/index.ts`: feature-specific API helper functions.
- `frontend/components/ui/*`: shared UI primitives.
- `frontend/components/screener/*`, `frontend/components/news/*`, and dashboard components: feature UI.

### Routing

Visible page routes include:

| Route Area | Files | Purpose |
| --- | --- | --- |
| Home/dashboard | `frontend/pages/index.tsx` | Landing or market overview |
| Auth | `frontend/pages/login.tsx` | Login flow |
| News | `frontend/pages/news.tsx` | BSE/government news display |
| IPO | `frontend/pages/ipo/index.tsx` | IPO data views |
| Screener | `frontend/pages/screener.tsx`, `frontend/pages/screener/[type].tsx` | Screener lists and typed screener views |
| Bhavcopy | `frontend/pages/bhavcopy.tsx`, `frontend/pages/bhavcopy/[type].tsx` | Bhavcopy data views |
| Company | `frontend/pages/company/[company].tsx` | Company detail pages |
| Formula | `frontend/pages/company/formula.tsx` | Formula/signal workflows |
| Watchlist | `frontend/pages/watchlist.tsx` | User watchlist |
| Master/admin | `frontend/pages/master/index.tsx` | Log/admin-style API execution tools |
| Mock API routes | `frontend/pages/api/company/*.js` | Local/mock company data endpoints |

### Authentication Flow

`AuthContext` stores the user in `localStorage` under `stockUser`, stores the token in `localStorage`, and also writes a JavaScript-managed `token` cookie. `middleware.ts` checks that cookie and redirects users for selected protected routes.

Protected middleware matcher:

```text
/watchlist
/portfolio
/dashboard
/company/:path*
/company/formula
```

Public routes listed in middleware:

```text
/login
/news
/ipo
/screener
/
```

### Frontend Strengths

- Good high-level separation between `pages`, `components`, `components/ui`, `context`, `hooks`, `lib`, `types`, and `utils`.
- API calls are mostly centralized rather than scattered directly through pages.
- UI primitives and reusable table/filter components reduce repetition.
- TypeScript is enabled with strict mode.
- Feature coverage is broad: screeners, bhavcopy, IPOs, listed companies, company analysis, watchlist, news, formulas, and logs.

### Frontend Risks and Gaps

1. Auth cookie security needs hardening.

   The token cookie is written from client JavaScript and does not visibly set `HttpOnly`, `Secure`, or `SameSite`. This increases exposure to XSS and session theft.

2. Subscription default likely grants access.

   `AuthContext` returns `isSubscribed: user?.is_subscribed || true`, which evaluates to `true` when the user is missing or explicitly false.

3. Router patterns are mixed.

   `frontend/context/ProtectedRoute.tsx` uses `react-router-dom` concepts in a Next.js app, and `frontend/pages/screener/[type].tsx` reportedly defines `generateStaticParams`, which belongs to the Next App Router, not the Pages Router.

4. Dependency versions are inconsistent.

   `frontend/package.json` uses Next `15.4.6` and React `19.1.0`, while `eslint-config-next` and `@next/swc-wasm-nodejs` are `13.5.1`, and `@types/react-dom` is React 18-era.

5. API route intent is unclear.

   `frontend/pages/api/company/*.js` appears to provide mock/demo data, while the real app mostly calls the backend. This should be documented or removed if unused.

6. No frontend tests were found.

   There are no visible Jest, Vitest, Playwright, or component test files.

7. Frontend README is generic.

   `frontend/README.md` is still the default Next.js generated README and does not document actual routes, env vars, auth, or backend API usage.

### Frontend Recommendations

- Replace client-written auth cookies with server-set `HttpOnly`, `Secure`, `SameSite` cookies or document the accepted risk for local-only usage.
- Change subscription logic to distinguish false, missing, and true values explicitly.
- Remove `react-router-dom` usage unless a separate client router is intentionally used.
- Align Next, React, ESLint, SWC, and React type package versions.
- Add `frontend/.env.example` with `NEXT_PUBLIC_API_URL`.
- Document which routes are public, authenticated, admin-only, and subscription-gated.
- Add at least smoke tests for login, protected route redirects, core dashboard rendering, and API helper behavior.

## Backend Analysis

### Overview

The backend is an Express API using ES modules, Babel, Sequelize, MySQL, JWT auth utilities, Winston/Morgan logging, Helmet, CORS, node-cron, Mocha, Chai, and Supertest.

Important files:

- `backend/src/index.js`: app creation, middleware, route mounting, DB startup, formula cron startup, server listen.
- `backend/src/routes/*`: Express route definitions.
- `backend/src/controllers/*`: request handlers.
- `backend/src/services/*`: business logic.
- `backend/src/models/index.js`: Sequelize connection/model aggregation.
- `backend/src/crons/formulaCron.js`: formula cron startup.
- `backend/tests/*`: current backend tests.

### Express Middleware and Startup

`backend/src/index.js` configures:

- CORS with explicit origins for localhost and production domains.
- `helmet()`.
- JSON and URL-encoded body limits of `20mb`.
- Morgan logging into the Winston log stream.
- Route mounting under `/vap`.
- Formula database authentication and table syncing.
- Formula cron startup through `startFormulaCron()`.

Most non-formula Sequelize authenticate/sync blocks are currently commented out.

### Route Map

Mounted route prefixes in `backend/src/index.js` include:

| Prefix | Router | Purpose |
| --- | --- | --- |
| `/vap/stocks` | `stockDataRoutes` | Stock data |
| `/vap/company-data` | `stockDataRoutes` | Company data alias; note `companyDataRoutes` is imported but not mounted here |
| `/vap/bhavcopy` | `bhavcopyDataRoutes` | Bhavcopy data |
| `/vap/financial-data` | `financialDataRoutes` | Financial data |
| `/vap/company` | `yFinanceRoutes` | YFinance/company endpoints |
| `/vap/screener` | `screenerDataRoutes` | Screener data |
| `/vap/ipo` | `ipoRoutes` | IPO data |
| `/vap/bse-news` | `announcementsRoutes` | BSE announcements |
| `/vap/gov-news` | `govNewsRouter` | Government news |
| `/vap/indices` | `indicesRoute` | NSE/index ingest routes |
| `/vap/finnhub` | `finnhubRoute` | Finnhub routes |
| `/vap/formula` | `formulaRoutes` | Formula execution and signal endpoints |
| `/vap/users` | `userRoutes` | User/auth endpoints |
| `/vap/holidays` | `holidayRoutes` | Market holidays |
| `/vap/logs` | `logRoutes` | Cron logs |
| `/vap/cron` | `cronManagementRoutes` | Cron management |

### Data Layer

The backend uses Sequelize models across several MySQL database areas:

- Stock market data.
- Bhavcopy data.
- Screener data.
- YFinance/company data.
- IPO data.
- Announcements/news.
- NSE dynamic/index data.
- Formula data.

Configuration appears split between `backend/src/config/database.js`, `backend/src/config/config.js`, and `backend/src/models/index.js`, with inconsistent environment variable naming and fallback behavior.

### Backend Strengths

- Conventional route/controller/service/model structure is present across many features.
- `app` is exported and server startup is guarded by `NODE_ENV !== "test"`, which supports Supertest integration.
- Central logging, request logging, CORS, Helmet, and error middleware exist.
- Formula cron has a dedicated model/logging path and management utilities.
- API surface is broad enough to support the frontend's company, screener, formula, IPO, news, bhavcopy, and watchlist workflows.

### Backend Risks and Gaps

1. Admin and mutating endpoints appear public.

   `backend/src/routes/cronManagementRoutes.js` can start, stop, and inspect cron jobs without auth. The file itself says auth should be added before production. `backend/src/routes/formulaRoutes.js` also exposes formula execution endpoints without visible auth middleware.

2. Auth flow has inconsistencies.

   Review found mismatches such as auth middleware setting one request field while profile reads another, hardcoded JWT fallback strings in some flows, and refresh-token code paths expecting cookie/Redis behavior that appears partially commented.

3. Database config is fragmented.

   Database details are spread across multiple config files and model setup files. Some defaults may never be used because of expressions like literal strings before `|| process.env...`.

4. Startup only syncs formula models.

   Other database authenticate/sync blocks are commented out. That may be intentional after moving initialization to Python, but it should be explicitly documented.

5. Route mounting may contain an accidental alias.

   `companyDataRoutes` is imported, but `/vap/company-data` mounts `stockDataRoutes`.

6. Backend tests are minimal.

   Current tests only check `GET /vap/welcome` and a simple logout response. API auth, DB-backed endpoints, cron controls, formula calculations, and error cases are not covered.

7. Dockerfile port mismatch.

   The backend Dockerfile reportedly exposes `4000`, while the app defaults to `8000`.

8. Cron tracking may be incomplete.

   Startup calls `startFormulaCron()` directly, while management APIs appear to track jobs initialized through management helpers. This can make active job reporting misleading.

### Backend Recommendations

- Add authentication and role checks to cron management, formula execution, and other mutating/expensive endpoints.
- Consolidate DB config into one clear source of truth and document all required env vars.
- Clarify whether Python or backend owns table creation for each database.
- Fix or document `/vap/company-data` route mounting.
- Replace hardcoded JWT fallback strings with required environment variables.
- Expand tests around auth, route authorization, formula endpoints, and critical DB service behavior.
- Align Docker port and runtime port.

## Python Service Analysis

### Overview

The Python service is a FastAPI application that aggregates and ingests stock market data from external sources. It uses APScheduler for recurring jobs, PyMySQL/SQLAlchemy for database access, pandas/numpy for data processing, requests/BeautifulSoup/lxml/tls-client for external fetches and scraping, and yfinance for market/company data.

Important files:

- `python/app/main.py`: FastAPI app, route registration, health/info endpoints, startup/shutdown behavior.
- `python/app/config.py`: required environment variables and scheduler/source configuration.
- `python/app/database/startup.py`: MySQL readiness check and database creation.
- `python/app/database/connection.py`: database manager/connection helpers.
- `python/app/routes/*`: FastAPI routers.
- `python/app/services/*`: scraping, ingestion, persistence, and service logic.
- `python/app/cron/*`: scheduler startup and cron job definitions.

### FastAPI Startup Behavior

`python/app/main.py` creates a FastAPI app with:

```text
title: Unified Stock Data API
version: 2.1
root_path: /ml
docs_url: /docs
redoc_url: /redoc
openapi_url: /openapi.json
```

On startup it:

1. Calls `ensure_databases()`.
2. Calls `get_yfinance_service().__init__()`.
3. Warms up a BSE session in a background thread.
4. Starts configured cron jobs through `initialize_cron_jobs()`.

On shutdown it attempts to stop several scheduler instances.

### Route Map

Routers included in `python/app/main.py`:

| Prefix | Router | Purpose |
| --- | --- | --- |
| `/bhavcopy` | `bhavcopy.router` | Bhavcopy data |
| `/nse` | `nse.router` | NSE data |
| `/screener` | `screener.router` | Screener ingestion/data |
| `/yfinance` | `yfinance.router` | YFinance/company market data |
| `/ipo-scraper` | `ipo_scraper.router` | IPO scraping |
| `/bse` | `bse_ann_api.router` | BSE announcements |
| `/gov-news` | `gov_news_api.router` | Government news |
| `/ingest` | `nse_master_ingest.router` | NSE master ingest |
| `/cron` | `cron.router` | Cron controls/status |
| `/nse-all-companies` | `nse_all_companies.router` | NSE listed/all companies |
| `/company-profile` | `company_profile.router` | Company profile ingestion |

Because the FastAPI app uses `root_path="/ml"`, deployment paths may effectively be under `/ml`.

### Cron Jobs

Cron startup in `initialize_cron_jobs()` includes:

- IPO cron service.
- Listed companies cron.
- NSE indices scheduler.
- Government news cron.
- NSE all companies/company profile cron.
- Today's bhavcopy cron.
- BSE announcements cron.
- Indian market holidays cron.

Screener scheduler and YFinance cron startup are currently commented out, but `/health` still reports them as running.

### Configuration

`python/app/config.py` is fail-fast at import time. Required values include:

- API keys: `ALPHA_VANTAGE_API_KEY`, `FMP_API_KEY`.
- DB connection: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`.
- DB names: `DB_BHAVCOPY`, `DB_STOCK_MARKET`.
- URLs: `NSE_BHAVCOPY_URL`, `NSE_LISTED_COMPANIES_URL`, `SCREENER_BASE_URL`.
- Scheduler: `SCHEDULER_TIMEZONE`, `ENABLE_SCHEDULER`, `BHAVCOPY_UPDATE_CRON`, `HISTORICAL_UPDATE_CRON`, `LISTED_UPDATE_CRON`, `IPO_UPDATE_CRON`.
- IPO source flags and refresh intervals.
- Scraping delay, retry, timeout, and worker settings.

Recent config changes consolidate legacy database categories into `DB_STOCK_MARKET`, while `DB_BHAVCOPY` remains separate.

### Python Strengths

- Clear separation between `routes`, `services`, `cron`, `database`, `models`, and `utils`.
- Startup now centralizes database creation through `python/app/database/startup.py`.
- Database sprawl is reduced by consolidating many legacy categories into `DB_STOCK_MARKET`.
- Several schedulers use retry/backoff, max instance limits, coalescing, and throttling to reduce external API pressure.
- Cron logging infrastructure exists through `cron_logger_service` and decorator utilities.

### Python Risks and Gaps

1. `ENABLE_SCHEDULER` is not respected by startup.

   Config defines the flag, but `main.py` starts crons regardless.

2. Startup has heavy side effects.

   Importing and starting the app can create databases, initialize yfinance tables, warm BSE, and start multiple schedulers. This complicates testing, local development, and deployments.

3. Health output can be inaccurate.

   `/health` reports screener and yfinance jobs as running even though those startup calls are commented out.

4. Router prefix duplication may exist.

   `python/app/routes/bhavcopy.py` reportedly defines its own `/bhavcopy` prefix and `main.py` also includes it with `/bhavcopy`, which can produce duplicated routes.

5. Some routers are not included.

   `python/app/routes/indian_market_routes.py` and `python/app/routes/cron_logs_routes.py` define routers but are not included in `main.py`.

6. Some endpoints may be incomplete.

   `company_profile_service.py` reportedly has placeholder methods used by active routes. `yfinance.py` reportedly calls a method not found in `yfinance_service.py`.

7. Requirements are heavily pinned and may need compatibility verification.

   Examples include very new `numpy==2.4.6` and `pandas==3.0.3` pins alongside older libraries.

8. No Python tests were found.

   There is no visible pytest setup or Python test directory.

9. Legacy/copy files increase ambiguity.

   Multiple old, copy, or semiworking service and cron files remain in active folders.

### Python Recommendations

- Gate scheduler startup behind `ENABLE_SCHEDULER`.
- Separate app creation from side-effectful startup work so tests can import the app safely.
- Make `/health` reflect actual scheduler state.
- Fix route prefix duplication and include or remove unused routers.
- Complete or remove placeholder company profile endpoints.
- Add `.env.example` with all required Python variables.
- Add pytest smoke tests for app creation, health, config validation, and route registration.
- Move legacy/copy files into archive documentation or remove them if obsolete.

## Testing Assessment

Current visible test coverage:

| Area | Current Coverage | Gaps |
| --- | --- | --- |
| Frontend | No tests found | Route rendering, auth redirects, API helpers, critical components |
| Backend | Two small Mocha tests | Auth, authorization, DB-backed endpoints, formula services, cron controls |
| Python | No tests found | App startup, config validation, route registration, scheduler gating, service parsing |

Recommended first testing milestones:

1. Backend authorization tests for cron and formula routes.
2. Frontend auth middleware and `AuthContext` tests.
3. Python FastAPI `TestClient` tests with scheduler disabled.
4. Contract tests for frontend API helper paths versus backend route prefixes.
5. Smoke tests for health endpoints across backend and Python.

## Security and Production Readiness

High-priority security items:

- Protect backend admin/mutating routes with authentication and role-based authorization.
- Do not store sensitive access tokens in JavaScript-accessible cookies/localStorage unless this is explicitly accepted.
- Remove hardcoded JWT fallback strings.
- Ensure CORS origins are environment-driven and production-specific.
- Avoid exposing arbitrary API execution tools to non-admin users.
- Add rate limiting to expensive formula, scraping, and ingestion trigger endpoints.
- Review logs for accidental secrets or user data.

Operational readiness items:

- Add `.env.example` files for each service.
- Align Docker exposed ports with application ports.
- Document which service owns schema creation for each database.
- Add scheduler disable switches for local/dev/test environments.
- Add service health checks that report real dependency and scheduler state.
- Reduce startup side effects for predictable deployment behavior.

## Documentation Gaps to Fill Next

Recommended documentation files:

- `frontend/README.md`: actual frontend setup, env vars, route map, auth model, scripts.
- `backend/README.md`: API setup, env vars, route map, auth, DB ownership, cron operations.
- `python/README.md`: FastAPI setup, env vars, startup side effects, scheduler behavior, route map.
- `.env.example` per service.
- API contract documentation for frontend helper functions and backend route prefixes.
- Database ownership and schema map across backend and Python.
- Cron schedule and operational runbook.

## Prioritized Next Steps

1. Secure backend cron and formula routes.
2. Fix frontend subscription default and auth cookie/session design.
3. Gate Python schedulers with `ENABLE_SCHEDULER`.
4. Add accurate `.env.example` files.
5. Clean up stale/copy files or move them to an explicit archive.
6. Align frontend dependency versions.
7. Expand backend tests around auth and critical APIs.
8. Add Python smoke tests with scheduler disabled.
9. Replace generic READMEs with service-specific documentation.
10. Document database ownership and startup responsibilities.

