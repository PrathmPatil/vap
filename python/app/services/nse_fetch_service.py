import tls_client
import time
import random
import logging
from urllib.parse import quote
from datetime import datetime
import yfinance as yf
import requests

logger = logging.getLogger(__name__)

DEFAULT_QUOTE_SYMBOLS = [
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
]

NSE_BASE_URL = "https://www.nseindia.com"

PREDICTION_SOURCE_CATALOG = [
    {
        "name": "all_indices",
        "category": "market_breadth",
        "table": "nse_all_indices",
        "endpoint": "/api/allIndices",
        "usefulness": "Index trend, breadth, advances/declines, and sector rotation.",
    },
    {
        "name": "pre_open_all",
        "category": "pre_market",
        "table": "nse_pre_open_all",
        "endpoint": "/api/market-data-pre-open?key=ALL",
        "usefulness": "Pre-open demand/supply imbalance and gap candidates.",
    },
    {
        "name": "nifty_50_constituents",
        "category": "index_constituents",
        "table": "nse_nifty_50_constituents",
        "endpoint": "/api/equity-stockIndices?index=NIFTY%2050",
        "usefulness": "NIFTY 50 constituent momentum, turnover, and market breadth.",
    },
    {
        "name": "nifty_bank_constituents",
        "category": "index_constituents",
        "table": "nse_nifty_bank_constituents",
        "endpoint": "/api/equity-stockIndices?index=NIFTY%20BANK",
        "usefulness": "Banking-sector leadership and risk-on/risk-off signal.",
    },
    {
        "name": "most_active_value",
        "category": "liquidity",
        "table": "nse_most_active_value",
        "endpoint": "/api/live-analysis-most-active-securities?index=value",
        "usefulness": "Value-traded liquidity concentration and institutional activity proxy.",
    },
    {
        "name": "most_active_volume",
        "category": "liquidity",
        "table": "nse_most_active_volume",
        "endpoint": "/api/live-analysis-most-active-securities?index=volume",
        "usefulness": "Unusual volume candidates for breakout formulas.",
    },
    {
        "name": "volume_gainers",
        "category": "volume",
        "table": "nse_volume_gainers",
        "endpoint": "/api/live-analysis-volume-gainers",
        "usefulness": "Volume expansion signal for accumulation/breakout screening.",
    },
    {
        "name": "market_status",
        "category": "market_state",
        "table": "nse_market_status",
        "endpoint": "/api/marketStatus",
        "usefulness": "Market session status for deciding whether live formulas should run.",
    },
    {
        "name": "corporate_announcements",
        "category": "events",
        "table": "nse_corporate_announcements",
        "endpoint": "/api/corporate-announcements?index=equities",
        "usefulness": "Event/news catalysts for price and volume moves.",
    },
    {
        "name": "corporate_actions",
        "category": "events",
        "table": "nse_corporate_actions",
        "endpoint": "/api/corporates-corporateActions?index=equities",
        "usefulness": "Splits, dividends, bonuses, and adjustment events.",
    },
    {
        "name": "option_chain_nifty",
        "category": "derivatives",
        "table": "nse_option_chain_nifty",
        "endpoint": "/api/option-chain-indices?symbol=NIFTY",
        "usefulness": "Index option OI, PCR, support/resistance, and volatility signals.",
    },
    {
        "name": "option_chain_banknifty",
        "category": "derivatives",
        "table": "nse_option_chain_banknifty",
        "endpoint": "/api/option-chain-indices?symbol=BANKNIFTY",
        "usefulness": "Bank index option OI and sentiment confirmation.",
    },
]

# Pages + JSON/file endpoints the NSE website itself uses for listed-company data.
NSE_PUBLIC_PAGES = [
    {
        "id": "corporate_filings_financial_results",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-financial-results",
        "kind": "html_page",
        "note": "All listed companies’ financial-result filings.",
    },
    {
        "id": "nse_ltd_investor_financials",
        "url": "https://www.nseindia.com/static/investor-relations/financials",
        "kind": "html_page",
        "note": "NSE Limited’s own IR financials (the exchange as a listed company), not the universe of listed stocks.",
    },
    {
        "id": "equity_quote",
        "url": "https://www.nseindia.com/get-quotes/equity?symbol={symbol}",
        "kind": "html_page",
        "note": "Live quote page.",
    },
    {
        "id": "corporate_announcements",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
        "kind": "html_page",
        "note": "Corporate announcements.",
    },
    {
        "id": "board_meetings",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-board-meetings",
        "kind": "html_page",
        "note": "Board meetings / next-move dates.",
    },
    {
        "id": "corporate_actions",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-actions",
        "kind": "html_page",
        "note": "Dividend, bonus, split, rights.",
    },
    {
        "id": "event_calendar",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-event-calendar",
        "kind": "html_page",
        "note": "Results calendar.",
    },
    {
        "id": "shareholding",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
        "kind": "html_page",
        "note": "Shareholding pattern.",
    },
    {
        "id": "insider_trading",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
        "kind": "html_page",
        "note": "Insider / PIT disclosures.",
    },
    {
        "id": "annual_reports",
        "url": "https://www.nseindia.com/companies-listing/corporate-filings-annual-reports",
        "kind": "html_page",
        "note": "Annual report PDFs.",
    },
    {
        "id": "listed_companies_csv",
        "url": "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
        "kind": "download_file",
        "note": "Official listed-equity master CSV (symbol, name, ISIN, series).",
    },
]

COMPANY_DOSSIER_SOURCES = [
    {
        "name": "quote",
        "category": "stock",
        "page": "https://www.nseindia.com/get-quotes/equity?symbol={symbol}",
        "endpoint": "/api/quote-equity?symbol={symbol}",
        "usefulness": "Price, change, 52w, industry, ISIN.",
    },
    {
        "name": "trade_info",
        "category": "stock",
        "page": "https://www.nseindia.com/get-quotes/equity?symbol={symbol}",
        "endpoint": "/api/quote-equity?symbol={symbol}&section=trade_info",
        "usefulness": "Volume, delivery, market cap.",
    },
    {
        "name": "meta",
        "category": "profile",
        "page": "https://www.nseindia.com/get-quotes/equity?symbol={symbol}",
        "endpoint": "/api/equity-meta-info?symbol={symbol}",
        "usefulness": "Listing metadata and identifiers.",
    },
    {
        "name": "financial_results_quarterly",
        "category": "financials",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-financial-results",
        "endpoint": "/api/corporates-financial-results?index=equities&symbol={symbol}&period=Quarterly",
        "usefulness": "Quarterly result filings.",
    },
    {
        "name": "financial_results_annual",
        "category": "financials",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-financial-results",
        "endpoint": "/api/corporates-financial-results?index=equities&symbol={symbol}&period=Annual",
        "usefulness": "Annual result filings.",
    },
    {
        "name": "announcements",
        "category": "news",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
        "endpoint": "/api/corporate-announcements?index=equities&symbol={symbol}",
        "usefulness": "Corporate announcements.",
    },
    {
        "name": "board_meetings",
        "category": "events",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-board-meetings",
        "endpoint": "/api/corporates-board-meetings?index=equities&symbol={symbol}",
        "usefulness": "Board meeting calendar.",
    },
    {
        "name": "corporate_actions",
        "category": "events",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-actions",
        "endpoint": "/api/corporates-corporateActions?index=equities&symbol={symbol}",
        "usefulness": "Dividends, bonus, splits.",
    },
    {
        "name": "event_calendar",
        "category": "events",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-event-calendar",
        "endpoint": "/api/event-calendar?index=equities&symbol={symbol}",
        "usefulness": "Upcoming result / event dates.",
    },
    {
        "name": "shareholding",
        "category": "ownership",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
        "endpoint": "/api/corporate-share-holdings-all?symbol={symbol}",
        "usefulness": "Shareholding pattern.",
    },
    {
        "name": "insider_trading",
        "category": "ownership",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
        "endpoint": "/api/corporates-pit?index=equities&symbol={symbol}",
        "usefulness": "Insider trades.",
    },
    {
        "name": "annual_reports",
        "category": "filings",
        "page": "https://www.nseindia.com/companies-listing/corporate-filings-annual-reports",
        "endpoint": "/api/annual-reports?index=equities&symbol={symbol}",
        "usefulness": "Annual report download links.",
    },
]

class NseFetchService:
    def __init__(self):
        self.session = tls_client.Session(
            client_identifier=random.choice([
                "chrome_120",
                "chrome_119",
                "chrome_118"
            ]),
            random_tls_extension_order=True
        )

        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.nseindia.com/",
            "Connection": "keep-alive",
            "Host": "www.nseindia.com",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        }

        self._warm_up()

    def get_headers(self, referer=None):
        headers = self.headers.copy()
        if referer:
            headers["Referer"] = referer
        return headers

    def _warm_up(self):
        try:
            self.session.get(
                "https://www.nseindia.com",
                headers=self.get_headers(),
                timeout_seconds=10,
            )
            time.sleep(1.5)
        except Exception as exc:
            logger.warning("[NSE] warmup failed: %s", exc)

    def safe_get(self, url, retries=4, referer=None):
        for attempt in range(retries):
            try:
                res = self.session.get(
                    url,
                    headers=self.get_headers(referer),
                    timeout_seconds=15,
                )
                logger.info("[NSE] %s -> %s", res.status_code, url)

                if res.status_code == 200:
                    return res.json()
            except Exception as exc:
                logger.warning(
                    "[NSE] request failed (%s/%s) -> %s: %s",
                    attempt + 1,
                    retries,
                    url,
                    exc,
                )

            time.sleep(2 + attempt)

        raise Exception("NSE blocked")

    def fetch_optional_json(self, endpoint, retries=2):
        url = endpoint if endpoint.startswith("http") else f"{NSE_BASE_URL}{endpoint}"
        try:
            return {
                "ok": True,
                "data": self.safe_get(url, retries=retries),
                "error": None,
            }
        except Exception as exc:
            logger.warning("[NSE] optional source failed %s: %s", endpoint, exc)
            return {
                "ok": False,
                "data": None,
                "error": str(exc),
            }

    def fetch_bytes(self, url, retries=2, referer=None):
        referer = referer or "https://www.nseindia.com/companies-listing/corporate-filings-financial-results"
        headers = {
            **self.get_headers(referer),
            "Accept": "*/*",
            "Accept-Encoding": "identity",
        }
        last_error = None
        http = requests.Session()
        try:
            for cookie in self.session.cookies:
                http.cookies.set(
                    cookie.name,
                    cookie.value,
                    domain=getattr(cookie, "domain", None),
                    path=getattr(cookie, "path", "/"),
                )
        except Exception:
            pass
        for attempt in range(retries):
            try:
                res = http.get(url, headers=headers, timeout=60)
                content = res.content
                if res.status_code == 200 and content:
                    if isinstance(content, str):
                        content = content.encode("latin-1", errors="ignore")
                    return {"ok": True, "data": content, "error": None, "status": 200}
                last_error = f"HTTP {res.status_code}"
            except Exception as exc:
                last_error = str(exc)
            time.sleep(1 + attempt)
        return {"ok": False, "data": None, "error": last_error, "status": None}

    def extract_records(self, payload):
        if payload is None:
            return []

        if isinstance(payload, list):
            return payload

        if not isinstance(payload, dict):
            return [{"value": payload}]

        for key in ("data", "value", "records"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
            if isinstance(value, dict):
                nested = self.extract_records(value)
                if nested:
                    return nested

        return [payload]

    def fetch_prediction_sources(self):
        results = {}

        for source in PREDICTION_SOURCE_CATALOG:
            response = self.fetch_optional_json(source["endpoint"])
            records = self.extract_records(response["data"]) if response["ok"] else []
            results[source["name"]] = {
                **source,
                "ok": response["ok"],
                "records": records,
                "record_count": len(records),
                "error": response["error"],
                "fetchedAt": datetime.now().isoformat(),
            }
            time.sleep(random.uniform(0.8, 1.4))

        return results

    def get_prediction_source_catalog(self):
        return PREDICTION_SOURCE_CATALOG

    def get_nse_page_catalog(self):
        return {
            "pages": NSE_PUBLIC_PAGES,
            "json_sources": COMPANY_DOSSIER_SOURCES,
            "note": (
                "NSE serves JSON under /api/* to its own HTML pages. "
                "nsearchives hosts downloadable CSV/ZIP files. "
                "/static/investor-relations/financials is NSE Ltd only."
            ),
        }

    def _format_endpoint(self, endpoint, symbol):
        encoded = quote(symbol, safe="")
        return endpoint.replace("{symbol}", encoded)

    def fetch_company_dossier(self, symbol):
        clean_symbol = self.normalize_symbol(symbol)
        quote_page = (
            f"https://www.nseindia.com/get-quotes/equity?symbol={quote(clean_symbol, safe='')}"
        )
        try:
            self.session.get(
                quote_page,
                headers=self.get_headers("https://www.nseindia.com/"),
                timeout_seconds=10,
            )
            time.sleep(0.4)
        except Exception as warmup_error:
            logger.warning("Dossier warmup failed %s: %s", clean_symbol, warmup_error)

        sources = {}
        for source in COMPANY_DOSSIER_SOURCES:
            endpoint = self._format_endpoint(source["endpoint"], clean_symbol)
            referer = source.get("page", quote_page).replace("{symbol}", quote(clean_symbol, safe=""))
            response = self.fetch_optional_json(endpoint, retries=2)
            records = self.extract_records(response["data"]) if response["ok"] else []
            sources[source["name"]] = {
                **source,
                "endpoint": endpoint,
                "page": referer,
                "ok": response["ok"],
                "records": records[:200],
                "record_count": len(records),
                "error": response["error"],
            }
            time.sleep(random.uniform(0.35, 0.7))

        ok_count = sum(1 for item in sources.values() if item["ok"])
        return {
            "success": ok_count > 0,
            "symbol": clean_symbol,
            "fetchedAt": datetime.now().isoformat(),
            "source_count": len(sources),
            "ok_count": ok_count,
            "pages": [
                {**page, "url": page["url"].replace("{symbol}", quote(clean_symbol, safe=""))}
                for page in NSE_PUBLIC_PAGES
            ],
            "sources": sources,
        }

    # ------------------ APIs ------------------

    def fetch_all_indices(self):
        return self.safe_get(
            "https://www.nseindia.com/api/allIndices"
        ).get("data", [])

    def fetch_all_symbols(self):
        return self.safe_get(
            "https://www.nseindia.com/api/market-data-pre-open?key=ALL"
        ).get("data", [])

    def extract_symbol(self, item):
        """Support both flat and nested NSE pre-open payload shapes."""
        if not isinstance(item, dict):
            return None

        symbol = item.get("symbol")
        if symbol:
            return symbol

        metadata = item.get("metadata")
        if isinstance(metadata, dict):
            return metadata.get("symbol")

        return None

    def get_quote_symbols(self, limit=25):
        symbols = []

        for item in self.fetch_all_symbols():
            symbol = self.extract_symbol(item)
            if symbol and symbol not in symbols:
                symbols.append(symbol)
            if len(symbols) >= limit:
                break

        if symbols:
            return symbols

        logger.warning(
            "[NSE] pre-open symbols unavailable; using fallback quote symbols"
        )
        return DEFAULT_QUOTE_SYMBOLS[:limit]

    def get_fast_value(self, fast_info, *keys):
        for key in keys:
            try:
                value = fast_info.get(key)
            except Exception:
                value = None
            if value is not None:
                return value
        return None

    def fetch_yfinance_quote(self, symbol):
        yf_symbol = symbol if symbol.endswith((".NS", ".BO")) else f"{symbol}.NS"

        try:
            ticker = yf.Ticker(yf_symbol)
            fast = ticker.fast_info

            last_price = self.get_fast_value(fast, "lastPrice", "last_price")
            previous_close = self.get_fast_value(
                fast,
                "previousClose",
                "previous_close",
            )

            if last_price is None and previous_close is None:
                return None

            price_change = None
            change_percent = None
            if last_price is not None and previous_close:
                price_change = last_price - previous_close
                change_percent = (price_change / previous_close) * 100

            return {
                "symbol": symbol,
                "source": "yfinance_fallback",
                "lastPrice": last_price,
                "previousClose": previous_close,
                "change": price_change,
                "pChange": change_percent,
                "open": self.get_fast_value(fast, "open"),
                "dayHigh": self.get_fast_value(fast, "dayHigh", "day_high"),
                "dayLow": self.get_fast_value(fast, "dayLow", "day_low"),
                "lastVolume": self.get_fast_value(
                    fast,
                    "lastVolume",
                    "last_volume",
                ),
                "marketCap": self.get_fast_value(
                    fast,
                    "marketCap",
                    "market_cap",
                ),
                "fetchedAt": datetime.now().isoformat(),
            }
        except Exception as exc:
            logger.warning("YFinance quote fallback failed %s: %s", symbol, exc)
            return None

    def fetch_quote_batch(self, symbols):
        results = []

        for sym in symbols:
            try:
                encoded_symbol = quote(sym, safe="")
                quote_page = (
                    "https://www.nseindia.com/get-quotes/equity"
                    f"?symbol={encoded_symbol}"
                )
                url = f"https://www.nseindia.com/api/quote-equity?symbol={encoded_symbol}"

                try:
                    self.session.get(
                        quote_page,
                        headers=self.get_headers("https://www.nseindia.com/"),
                        timeout_seconds=10,
                    )
                    time.sleep(random.uniform(0.3, 0.7))
                except Exception as warmup_error:
                    logger.warning(
                        "Quote page warmup failed %s: %s",
                        sym,
                        warmup_error,
                    )

                data = self.safe_get(url, retries=2, referer=quote_page)
                data["symbol"] = sym
                results.append(data)
            except Exception as e:
                logger.warning("Quote failed %s: %s", sym, e)
                fallback_quote = self.fetch_yfinance_quote(sym)
                if fallback_quote:
                    logger.info("Using yfinance fallback quote for %s", sym)
                    results.append(fallback_quote)

            time.sleep(random.uniform(0.8, 1.4))

        return results

    def fetch_live_quotes(self, limit=25):
        symbols = self.get_quote_symbols(limit)
        results = self.fetch_quote_batch(symbols)

        fallback_symbols = DEFAULT_QUOTE_SYMBOLS[:limit]
        if not results and symbols != fallback_symbols:
            logger.warning(
                "[NSE] pre-open quote candidates failed; retrying fallback symbols"
            )
            results = self.fetch_quote_batch(fallback_symbols)

        return results

    def normalize_symbol(self, symbol):
        return symbol.upper().replace(".NS", "").replace(".BO", "").strip()

    def fetch_symbol_intelligence(self, symbol):
        clean_symbol = self.normalize_symbol(symbol)
        encoded_symbol = quote(clean_symbol, safe="")

        quote_records = self.fetch_quote_batch([clean_symbol])
        meta = self.fetch_optional_json(
            f"/api/equity-meta-info?symbol={encoded_symbol}"
        )
        trade_info = self.fetch_optional_json(
            f"/api/quote-equity?symbol={encoded_symbol}&section=trade_info"
        )
        option_chain = self.fetch_optional_json(
            f"/api/option-chain-equities?symbol={encoded_symbol}",
            retries=1,
        )

        return {
            "symbol": clean_symbol,
            "fetchedAt": datetime.now().isoformat(),
            "sources": {
                "quote": {
                    "ok": bool(quote_records),
                    "records": quote_records,
                    "record_count": len(quote_records),
                    "usefulness": "Current price, change, volume, and fallback quote signal.",
                },
                "meta": {
                    "ok": meta["ok"],
                    "records": self.extract_records(meta["data"]) if meta["ok"] else [],
                    "record_count": len(self.extract_records(meta["data"])) if meta["ok"] else 0,
                    "error": meta["error"],
                    "usefulness": "Security metadata, identifiers, and listing context.",
                },
                "trade_info": {
                    "ok": trade_info["ok"],
                    "records": self.extract_records(trade_info["data"]) if trade_info["ok"] else [],
                    "record_count": len(self.extract_records(trade_info["data"])) if trade_info["ok"] else 0,
                    "error": trade_info["error"],
                    "usefulness": "Trade quantities, delivery/order-book style fields when NSE allows access.",
                },
                "option_chain": {
                    "ok": option_chain["ok"],
                    "records": self.extract_records(option_chain["data"]) if option_chain["ok"] else [],
                    "record_count": len(self.extract_records(option_chain["data"])) if option_chain["ok"] else 0,
                    "error": option_chain["error"],
                    "usefulness": "Open interest, implied volatility, and option support/resistance for F&O symbols.",
                },
            },
        }



# import requests
# import time

# class NseFetchService:

#     def __init__(self):
#         self.session = requests.Session()

#         # All required headers — NSE blocks without these
#         self.session.headers.update({
#             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
#             "Accept": "*/*",
#             "Accept-Encoding": "gzip, deflate, br, zstd",
#             "Accept-Language": "en-US,en;q=0.9",
#             "Connection": "keep-alive",
#             "Host": "www.nseindia.com",
#             "Origin": "https://www.nseindia.com",
#             "Referer": "https://www.nseindia.com/",
#             "sec-ch-ua": '"Chromium";v="120", "Not A(Brand";v="99"',
#             "sec-ch-ua-mobile": "?0",
#             "sec-ch-ua-platform": "\"Windows\"",
#             "Sec-Fetch-Dest": "empty",
#             "Sec-Fetch-Mode": "cors",
#             "Sec-Fetch-Site": "same-origin"
#         })

#         # Load cookies (ABSOLUTELY REQUIRED)
#         self.session.get("https://www.nseindia.com", timeout=10)

#     # -----------------------------
#     # Safe GET wrapper
#     # -----------------------------
#     def safe_get(self, url, retries=6, delay=1):
#         for attempt in range(retries):
#             try:
#                 res = self.session.get(url, timeout=10)
#                 if res.status_code == 200:
#                     return res.json()
#             except Exception:
#                 pass

#             print(f"Retry {attempt + 1}/{retries} → {url}")
#             time.sleep(delay)

#         raise Exception(f"Failed to fetch → {url}")

#     # -----------------------------
#     # 1) All Indices
#     # -----------------------------
#     def fetch_all_indices(self):
#         url = "https://www.nseindia.com/api/allIndices"
#         self.session.get("https://www.nseindia.com", timeout=10)  # refresh cookies
#         return self.safe_get(url).get("data", [])

#     # -----------------------------
#     # 2) All Symbols
#     # -----------------------------
#     def fetch_all_symbols(self):
#         url = "https://www.nseindia.com/api/allSymbols"
#         self.session.get("https://www.nseindia.com", timeout=10)  # refresh cookies

#         return self.safe_get(url).get("data", [])

#     # -----------------------------
#     # 3) Live Quotes
#     # -----------------------------
#     def fetch_live_quotes(self):
#         symbols = self.fetch_all_symbols()
#         results = []

#         for item in symbols:
#             sym = item["symbol"]
#             url = f"https://www.nseindia.com/api/quote-equity?symbol={sym}"

#             try:
#                 data = self.safe_get(url)
#                 data["symbol"] = sym
#                 results.append(data)
#             except:
#                 pass

#             time.sleep(0.5)  # avoid blocking

#         return results

#     # -----------------------------
#     # 4) F&O Underlyings
#     # -----------------------------
#     def fetch_fno_symbols(self):
#         url = "https://www.nseindia.com/api/underlyings"
#         return self.safe_get(url)

#     # -----------------------------
#     # 5) Option Chain
#     # -----------------------------
#     def fetch_option_chain(self):
#         fno_list = self.fetch_fno_symbols()
#         results = {}

#         for item in fno_list:
#             sym = item["symbol"]
#             url = f"https://www.nseindia.com/api/option-chain-equities?symbol={sym}"

#             try:
#                 results[sym] = self.safe_get(url)
#             except:
#                 pass

#             time.sleep(1.2)

#         return results


# nse_fetch = NseFetchService()
