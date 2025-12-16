import requests
import time

class NseFetchService:

    def __init__(self):
        self.session = requests.Session()

        # All required headers — NSE blocks without these
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Host": "www.nseindia.com",
            "Origin": "https://www.nseindia.com",
            "Referer": "https://www.nseindia.com/",
            "sec-ch-ua": '"Chromium";v="120", "Not A(Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        })

        # Load cookies (ABSOLUTELY REQUIRED)
        self.session.get("https://www.nseindia.com", timeout=10)

    # -----------------------------
    # Safe GET wrapper
    # -----------------------------
    def safe_get(self, url, retries=6, delay=1):
        for attempt in range(retries):
            try:
                res = self.session.get(url, timeout=10)
                if res.status_code == 200:
                    return res.json()
            except Exception:
                pass

            print(f"Retry {attempt + 1}/{retries} → {url}")
            time.sleep(delay)

        raise Exception(f"Failed to fetch → {url}")

    # -----------------------------
    # 1) All Indices
    # -----------------------------
    def fetch_all_indices(self):
        url = "https://www.nseindia.com/api/allIndices"
        self.session.get("https://www.nseindia.com", timeout=10)  # refresh cookies
        return self.safe_get(url).get("data", [])

    # -----------------------------
    # 2) All Symbols
    # -----------------------------
    def fetch_all_symbols(self):
        url = "https://www.nseindia.com/api/allSymbols"
        self.session.get("https://www.nseindia.com", timeout=10)  # refresh cookies

        return self.safe_get(url).get("data", [])

    # -----------------------------
    # 3) Live Quotes
    # -----------------------------
    def fetch_live_quotes(self):
        symbols = self.fetch_all_symbols()
        results = []

        for item in symbols:
            sym = item["symbol"]
            url = f"https://www.nseindia.com/api/quote-equity?symbol={sym}"

            try:
                data = self.safe_get(url)
                data["symbol"] = sym
                results.append(data)
            except:
                pass

            time.sleep(0.5)  # avoid blocking

        return results

    # -----------------------------
    # 4) F&O Underlyings
    # -----------------------------
    def fetch_fno_symbols(self):
        url = "https://www.nseindia.com/api/underlyings"
        return self.safe_get(url)

    # -----------------------------
    # 5) Option Chain
    # -----------------------------
    def fetch_option_chain(self):
        fno_list = self.fetch_fno_symbols()
        results = {}

        for item in fno_list:
            sym = item["symbol"]
            url = f"https://www.nseindia.com/api/option-chain-equities?symbol={sym}"

            try:
                results[sym] = self.safe_get(url)
            except:
                pass

            time.sleep(1.2)

        return results


nse_fetch = NseFetchService()
