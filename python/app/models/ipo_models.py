# app/models/ipo_models.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class IPOSource(str, Enum):
    CHITTORGARH = "chittorgarh"
    NSE = "nse"
    BSE = "bse"
    YAHOO_FINANCE = "yahoo_finance"
    MONEYCONTROL = "moneycontrol"
    ALPHA_VANTAGE = "alpha_vantage"
    FMP = "fmp"

class IPOStatus(str, Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    CLOSED = "closed"
    LISTED = "listed"

class IPOBase(BaseModel):
    company_name: Optional[str] = None
    symbol: Optional[str] = None
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    issue_price: Optional[float] = None
    issue_size: Optional[float] = None
    lot_size: Optional[int] = None
    listing_date: Optional[str] = None
    status: Optional[str] = None
    exchange: Optional[str] = None
    price_range: Optional[str] = None
    min_bid_quantity: Optional[int] = None

class IPOCreate(IPOBase):
    data_source: IPOSource

class IPO(IPOBase):
    id: int
    data_source: IPOSource
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IPOAnalysisResponse(BaseModel):
    total_ipos: int
    unique_companies: int
    avg_issue_size: Optional[float] = None
    max_issue_size: Optional[float] = None
    min_issue_size: Optional[float] = None
    yearly_trends: Dict[str, int] = {}
    status_distribution: Dict[str, int] = {}
    source_stats: Dict[str, int] = {}

class IPOSummaryResponse(BaseModel):
    source: str
    count: int
    last_updated: Optional[datetime] = None

class IPOFilter(BaseModel):
    source: Optional[IPOSource] = None
    status: Optional[IPOStatus] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    exchange: Optional[str] = None

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    count: Optional[int] = None