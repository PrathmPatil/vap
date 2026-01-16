# ipo_fetcher_fixed.py
import requests
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
import time

class WorkingIPOFetcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_moneycontrol_ipos(self) -> List[Dict]:
        """Scrape IPO data from Moneycontrol - No API key needed"""
        try:
            print("📡 Scraping IPO data from Moneycontrol...")
            url = "https://www.moneycontrol.com/ipo/ipo-snapshot/current-ipos.html"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            ipos = []
            
            # Look for IPO tables
            tables = soup.find_all('table', class_='mctable1')
            
            for table in tables:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 5:
                        ipo = {
                            'company': cols[0].get_text(strip=True) if len(cols) > 0 else 'N/A',
                            'issue_size': cols[1].get_text(strip=True) if len(cols) > 1 else 'N/A',
                            'price_range': cols[2].get_text(strip=True) if len(cols) > 2 else 'N/A',
                            'issue_dates': cols[3].get_text(strip=True) if len(cols) > 3 else 'N/A',
                            'listing_date': cols[4].get_text(strip=True) if len(cols) > 4 else 'N/A',
                            'source': 'moneycontrol'
                        }
                        ipos.append(ipo)
            
            return ipos
            
        except Exception as e:
            print(f"❌ Error scraping Moneycontrol: {e}")
            return []
    
    def scrape_chittorgarh_ipos(self) -> List[Dict]:
        """Scrape IPO data from Chittorgarh"""
        try:
            print("📡 Scraping IPO data from Chittorgarh...")
            url = "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            ipos = []
            
            # Try to find IPO tables
            table = soup.find('table', class_='table')
            if not table:
                table = soup.find('table')
            
            if table:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 8:
                        ipo = {
                            'company': cols[0].get_text(strip=True) if len(cols) > 0 else 'N/A',
                            'ipo_date': cols[1].get_text(strip=True) if len(cols) > 1 else 'N/A',
                            'price_range': cols[2].get_text(strip=True) if len(cols) > 2 else 'N/A',
                            'lot_size': cols[3].get_text(strip=True) if len(cols) > 3 else 'N/A',
                            'issue_size': cols[4].get_text(strip=True) if len(cols) > 4 else 'N/A',
                            'subscription': cols[5].get_text(strip=True) if len(cols) > 5 else 'N/A',
                            'allotment_date': cols[6].get_text(strip=True) if len(cols) > 6 else 'N/A',
                            'listing_date': cols[7].get_text(strip=True) if len(cols) > 7 else 'N/A',
                            'source': 'chittorgarh'
                        }
                        ipos.append(ipo)
            
            return ipos
            
        except Exception as e:
            print(f"❌ Error scraping Chittorgarh: {e}")
            return []
    
    def get_yahoo_finance_ipo_data(self) -> List[Dict]:
        """Get IPO data using Yahoo Finance API (no key needed)"""
        try:
            print("📡 Fetching IPO data from Yahoo Finance...")
            
            # Yahoo Finance IPO calendar URL
            url = "https://query1.finance.yahoo.com/v1/finance/ipo"
            params = {
                'region': 'US',
                'lang': 'en-US'
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            ipos = []
            
            if 'finance' in data and 'result' in data['finance']:
                for ipo in data['finance']['result']:
                    ipos.append({
                        'symbol': ipo.get('symbol', ''),
                        'company': ipo.get('companyName', ''),
                        'exchange': ipo.get('exchange', ''),
                        'price': ipo.get('price', ''),
                        'shares': ipo.get('shares', ''),
                        'expected_date': ipo.get('expectedDate', ''),
                        'status': ipo.get('status', ''),
                        'source': 'yahoo_finance'
                    })
            
            return ipos
            
        except Exception as e:
            print(f"❌ Error with Yahoo Finance: {e}")
            return []
    
    def get_mock_ipo_data(self) -> List[Dict]:
        """Generate mock IPO data for testing when APIs fail"""
        print("🎭 Generating mock IPO data for demonstration...")
        
        current_date = datetime.now()
        mock_ipos = []
        
        sample_companies = [
            {"name": "Tech Innovations Ltd", "symbol": "TECH", "sector": "Technology"},
            {"name": "Green Energy Corp", "symbol": "GREEN", "sector": "Energy"},
            {"name": "Health Plus Ltd", "symbol": "HLTH", "sector": "Healthcare"},
            {"name": "FinServe Partners", "symbol": "FINS", "sector": "Financial"},
            {"name": "Auto Motors India", "symbol": "AUTO", "sector": "Automobile"},
            {"name": "Retail Chain Corp", "symbol": "RETA", "sector": "Retail"},
            {"name": "Pharma Solutions", "symbol": "PHAR", "sector": "Pharmaceutical"},
            {"name": "Real Estate Dev", "symbol": "REAL", "sector": "Real Estate"}
        ]
        
        for i, company in enumerate(sample_companies):
            days_ago = (len(sample_companies) - i) * 5
            ipo_date = current_date - timedelta(days=days_ago)
            listing_date = ipo_date + timedelta(days=7)
            
            mock_ipos.append({
                'company': company['name'],
                'symbol': company['symbol'],
                'sector': company['sector'],
                'price_range': f"₹{180 + i*20}-₹{220 + i*20}",
                'lot_size': f"{50 + i*10} shares",
                'issue_size': f"₹{100 + i*25} crore",
                'ipo_date': ipo_date.strftime('%Y-%m-%d'),
                'listing_date': listing_date.strftime('%Y-%m-%d'),
                'subscription': f"{10 + i*3}.{i}x",
                'current_status': 'Listed' if i < 4 else 'Upcoming',
                'listing_gains': f"+{15 + i*5}%",
                'current_gains': f"+{20 + i*8}%",
                'source': 'mock_data'
            })
        
        return mock_ipos
    
    def filter_by_date(self, ipos: List[Dict], start_date: str, end_date: str) -> List[Dict]:
        """Filter IPO data by date range"""
        filtered_ipos = []
        
        for ipo in ipos:
            ipo_date = ipo.get('ipo_date') or ipo.get('expected_date') or ipo.get('listing_date')
            
            if ipo_date and ipo_date != 'N/A':
                try:
                    # Handle different date formats
                    if 'T' in ipo_date:
                        ipo_date = ipo_date.split('T')[0]
                    
                    ipo_date_obj = datetime.strptime(ipo_date, '%Y-%m-%d').date()
                    start_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    
                    if start_obj <= ipo_date_obj <= end_obj:
                        filtered_ipos.append(ipo)
                        
                except ValueError:
                    # If date parsing fails, include it anyway for demo
                    filtered_ipos.append(ipo)
        
        return filtered_ipos
    
    def get_ipo_data(self, start_date: str, end_date: str = None) -> Dict:
        """Main function to get IPO data by date range"""
        if end_date is None:
            end_date = start_date
        
        print(f"🔍 Looking for IPOs from {start_date} to {end_date}")
        
        # Try multiple data sources
        all_ipos = []
        
        # Source 1: Yahoo Finance
        yahoo_data = self.get_yahoo_finance_ipo_data()
        all_ipos.extend(yahoo_data)
        
        # Source 2: Moneycontrol scraping
        moneycontrol_data = self.scrape_moneycontrol_ipos()
        all_ipos.extend(moneycontrol_data)
        
        # Source 3: Chittorgarh scraping
        chittorgarh_data = self.scrape_chittorgarh_ipos()
        all_ipos.extend(chittorgarh_data)
        
        # If no real data found, use mock data
        if not all_ipos:
            print("⚠️  No real data found from APIs, using mock data for demonstration")
            all_ipos = self.get_mock_ipo_data()
        
        # Filter by date
        filtered_ipos = self.filter_by_date(all_ipos, start_date, end_date)
        
        print(f"✅ Found {len(filtered_ipos)} IPOs in date range")
        
        # Prepare result
        result = {
            'metadata': {
                'start_date': start_date,
                'end_date': end_date,
                'total_records': len(filtered_ipos),
                'data_sources': list(set(ipo.get('source', 'unknown') for ipo in filtered_ipos)),
                'timestamp': datetime.now().isoformat(),
                'note': 'Some data may be mock data for demonstration'
            },
            'ipos': filtered_ipos
        }
        
        return result

def save_to_json(data: Dict, filename: str = None):
    """Save data to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"ipo_data_{timestamp}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Data saved to: {filename}")
    return filename

def print_summary(data: Dict):
    """Print summary of the data"""
    ipos = data.get('ipos', [])
    metadata = data.get('metadata', {})
    
    print(f"\n{'='*60}")
    print(f"📊 IPO DATA SUMMARY")
    print(f"{'='*60}")
    print(f"📅 Date Range: {metadata.get('start_date')} to {metadata.get('end_date')}")
    print(f"📈 Total IPOs Found: {len(ipos)}")
    print(f"🔗 Data Sources: {', '.join(metadata.get('data_sources', []))}")
    print(f"⏰ Generated at: {metadata.get('timestamp')}")
    
    if metadata.get('note'):
        print(f"💡 Note: {metadata.get('note')}")
    
    if ipos:
        print(f"\n🏢 SAMPLE IPOs (showing first 10):")
        print(f"{'-'*60}")
        for i, ipo in enumerate(ipos[:10]):
            company = ipo.get('company', 'N/A')
            symbol = ipo.get('symbol', 'N/A')
            price = ipo.get('price_range', ipo.get('price', 'N/A'))
            ipo_date = ipo.get('ipo_date', ipo.get('expected_date', ipo.get('listing_date', 'N/A')))
            status = ipo.get('current_status', ipo.get('status', 'N/A'))
            
            print(f"  {i+1:2d}. {company:25} | {symbol:8} | {price:15} | {ipo_date:10} | {status}")

def main():
    """Main function to run the IPO fetcher"""
    print("🚀 IPO Data Fetcher - Fixed Version")
    print("=" * 50)
    
    fetcher = WorkingIPOFetcher()
    
    # Example 1: Recent IPOs (last 60 days)
    print("\n1. 📊 Fetching RECENT IPOs (last 60 days)...")
    start_date = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    recent_data = fetcher.get_ipo_data(start_date, end_date)
    print_summary(recent_data)
    save_to_json(recent_data, "recent_ipos.json")
    
    # Example 2: Upcoming IPOs (next 30 days)
    print("\n2. 📅 Fetching UPCOMING IPOs (next 30 days)...")
    start_date = datetime.now().strftime('%Y-%m-%d')
    end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    upcoming_data = fetcher.get_ipo_data(start_date, end_date)
    print_summary(upcoming_data)
    save_to_json(upcoming_data, "upcoming_ipos.json")
    
    # Example 3: Specific month
    print("\n3. 📋 Fetching IPOs for current month...")
    current_month_start = datetime.now().replace(day=1).strftime('%Y-%m-%d')
    current_month_end = datetime.now().strftime('%Y-%m-%d')
    
    month_data = fetcher.get_ipo_data(current_month_start, current_month_end)
    print_summary(month_data)
    save_to_json(month_data, "current_month_ipos.json")
    
    print(f"\n🎉 All done! Check the generated JSON files for complete data.")
    print(f"💡 Tip: For real-time data, consider getting API keys from:")
    print(f"   - Alpha Vantage: https://www.alphavantage.co/support/#api-key")
    print(f"   - Financial Modeling Prep: https://financialmodelingprep.com/developer/docs/")

if __name__ == "__main__":
    main()