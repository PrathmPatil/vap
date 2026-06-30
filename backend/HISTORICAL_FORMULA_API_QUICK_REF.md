# Historical Formula Data - Quick Reference

## 🔐 Authentication Required
All endpoints require:
- Valid JWT token with **master** role
- Authorization header: `Authorization: Bearer <token>`

## 📅 Get Available Dates
Get list of dates with available formula data.

```bash
POST /api/formula/available-dates

Request Body:
{
  "formulaType": "rally-attempt",
  "limit": 30
}

Response:
{
  "success": true,
  "formula_type": "rally-attempt",
  "dates": ["2024-01-15", "2024-01-14", ...],
  "count": 30
}
```

## 📊 Historical Data Endpoints

### 1. Rally Attempt by Date
```bash
POST /api/formula/rally-attempt-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": ""
}
```

### 2. Strong Bullish by Date
```bash
POST /api/formula/strong-bullish-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": "",
  "basePercent": 2
}
```

### 3. Follow Through Day by Date
```bash
POST /api/formula/follow-through-day-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": ""
}
```

### 4. Buy Day by Date
```bash
POST /api/formula/buy-day-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": ""
}
```

### 5. Volume Breakout by Date
```bash
POST /api/formula/volume-breakout-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": ""
}
```

### 6. Tweezer Bottom by Date
```bash
POST /api/formula/tweezer-bottom-by-date

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": ""
}
```

## 📝 Response Format

All data endpoints return:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "INFY",
      "security": "Infosys Limited",
      "rally_date": "2024-01-15",
      "close_price": 1234.50,
      ...
    }
  ],
  "latest_date": "2024-01-15",
  "queried_date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "totalItems": 45,
  "totalPages": 5,
  "message": "..."
}
```

## 🔍 Formula Type Names
For `/available-dates` endpoint:
- `strong-bullish` or `strong_bullish`
- `rally-attempt` or `rally_attempt`
- `follow-through-day` or `follow_through_day`
- `buy-day` or `buy_day`
- `volume-breakout` or `volume_breakout`
- `tweezer-bottom` or `tweezer_bottom`

## ⚠️ Error Responses

### 400 - Missing Date
```json
{
  "success": false,
  "message": "Date parameter is required"
}
```

### 401 - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 - Insufficient Permissions
```json
{
  "success": false,
  "message": "Access denied. Required role(s): master"
}
```

### 404 - No Data for Date
```json
{
  "success": true,
  "data": [],
  "totalItems": 0,
  "message": "No data found for the specified date"
}
```

## 💡 Usage Tips

1. **Always call `/available-dates` first** to get valid dates
2. **Use date format** `YYYY-MM-DD` (e.g., `2024-01-15`)
3. **Pagination recommended** to avoid large responses
4. **searchTerm** filters by symbol or security name
5. **basePercent** parameter only applies to strong-bullish endpoint

## 🧪 Example Usage (JavaScript)

```javascript
const token = 'your_master_token';

// Step 1: Get available dates
const datesResponse = await fetch('/api/formula/available-dates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    formulaType: 'rally-attempt',
    limit: 30
  })
});
const { dates } = await datesResponse.json();

// Step 2: Get data for selected date
const dataResponse = await fetch('/api/formula/rally-attempt-by-date', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    date: dates[0],
    currentPage: 1,
    itemsPerPage: 10,
    searchTerm: ''
  })
});
const { data } = await dataResponse.json();
console.log(data);
```

## 🔐 Security Notes

- ✅ All historical endpoints require **master role**
- ✅ RBAC enforced at middleware level
- ✅ Token validation on every request
- ✅ Role check prevents unauthorized access
- ⚠️ Ensure JWT_SECRET is configured in environment

## 📞 Support

For issues or questions about this feature, check:
- `HISTORICAL_FORMULA_DATA_FEATURE.md` - Complete documentation
- Backend logs for error details
- Token payload to verify role
