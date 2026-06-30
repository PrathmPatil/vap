# Historical Formula Data Feature - Implementation Guide

## Overview
Masters can now view historical formula data from any past date. The data is already being stored in the database with timestamps, and this feature provides secure access to retrieve it.

## Architecture

### 1. Database Layer
**Data Already Stored**: All formula models store data with date fields:
- `RallyAttemptDay`: stores `rally_date`
- `FollowThroughDay`: stores `ftd_date`
- `BuyDay`: stores `buy_date`
- `StrongBullishCandle`: stores `trade_date`
- `VolumeBreakout`: stores `trade_date`
- `TweezerBottom`: stores `trade_date`

### 2. Security Layer (RBAC)
**File**: `src/middlewares/rbac.middleware.js`
```javascript
// Only masters can access historical data
router.post("/rally-attempt-by-date", requireMaster, getRallyAttemptByDate);
```

**Available Role Checks**:
- `requireMaster` - Only 'master' role
- `requireMasterOrAdmin` - 'master' or 'administrative' roles
- `checkRole(['role1', 'role2'])` - Custom roles

### 3. Service Layer
**File**: `src/services/formulaService.js`

**Enhanced `buildFormulaQuery()` Function**:
```javascript
// Now accepts optional specificDate parameter
const result = await buildFormulaQuery({
  model: RallyAttemptDayModel,
  dateField: 'rally_date',
  currentPage: 1,
  itemsPerPage: 10,
  searchTerm: '',
  searchFields: ['symbol', 'security'],
  specificDate: '2024-01-15',  // NEW: Query specific date
  includeLatestDate: false      // Don't use latest if specific date provided
});
```

**New Service Function**:
```javascript
// Get available dates for date picker
getAvailableDatesService(formulaType, limit)
// Returns: { success: true, dates: ['2024-01-15', '2024-01-14', ...], count: 30 }
```

### 4. Controller Layer
**File**: `src/controllers/formulaController.js`

**New Endpoints** (All require Master role):
1. `getAvailableDates()` - Get list of available dates
2. `getStrongBullishByDate()` - Get strong bullish by date
3. `getRallyAttemptByDate()` - Get rally attempt by date
4. `getFollowThroughDayByDate()` - Get follow through day by date
5. `getBuyDayByDate()` - Get buy day by date
6. `getVolumeBreakoutByDate()` - Get volume breakout by date
7. `getTweezerBottomByDate()` - Get tweezer bottom by date

### 5. Routes
**File**: `src/routes/formulaRoutes.js`

```javascript
// Get available dates for a formula type
router.post("/available-dates", requireMaster, getAvailableDates);

// Get historical data for each formula type
router.post("/strong-bullish-by-date", requireMaster, getStrongBullishByDate);
router.post("/rally-attempt-by-date", requireMaster, getRallyAttemptByDate);
router.post("/follow-through-day-by-date", requireMaster, getFollowThroughDayByDate);
router.post("/buy-day-by-date", requireMaster, getBuyDayByDate);
router.post("/volume-breakout-by-date", requireMaster, getVolumeBreakoutByDate);
router.post("/tweezer-bottom-by-date", requireMaster, getTweezerBottomByDate);
```

## API Usage

### 1. Get Available Dates
Fetch list of available dates to populate date picker.

**Request**:
```javascript
POST /api/formula/available-dates
Content-Type: application/json

{
  "formulaType": "rally-attempt",
  "limit": 30
}
```

**Response**:
```json
{
  "success": true,
  "formula_type": "rally-attempt",
  "dates": [
    "2024-01-15",
    "2024-01-14",
    "2024-01-13",
    ...
  ],
  "count": 30
}
```

### 2. Get Historical Rally Attempt Data
Get rally attempt records for a specific date.

**Request**:
```javascript
POST /api/formula/rally-attempt-by-date
Content-Type: application/json
Authorization: Bearer <token_with_master_role>

{
  "date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "searchTerm": "INFY"
}
```

**Response**:
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
      "status": "rally_detected",
      "created_at": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "latest_date": "2024-01-15",
  "queried_date": "2024-01-15",
  "currentPage": 1,
  "itemsPerPage": 10,
  "totalItems": 45,
  "totalPages": 5,
  "message": "Rally attempt data retrieved for the specified date"
}
```

### 3. Similar Endpoints for Other Formulas
Replace `/rally-attempt-by-date` with:
- `/strong-bullish-by-date`
- `/follow-through-day-by-date`
- `/buy-day-by-date`
- `/volume-breakout-by-date`
- `/tweezer-bottom-by-date`

**All endpoints follow the same request/response pattern**.

## Authentication & Authorization

### Token Requirements
All historical endpoints require a valid JWT token with master role:

```javascript
// Token payload must include:
{
  "user": {
    "id": 123,
    "role": "master",  // REQUIRED for historical data
    "email": "user@example.com"
  }
}
```

### Error Handling
```javascript
// 400 - Missing date parameter
{
  "success": false,
  "message": "Date parameter is required"
}

// 401 - Invalid/expired token
{
  "success": false,
  "message": "Invalid or expired token"
}

// 403 - Insufficient permissions
{
  "success": false,
  "message": "Access denied. Required role(s): master"
}

// 404 - No data for date
{
  "success": true,
  "data": [],
  "totalItems": 0,
  "message": "No data found for the specified date"
}
```

## Implementation Checklist

### Backend ✅ COMPLETED
- [x] RBAC middleware for role checking
- [x] Service functions support `specificDate` parameter
- [x] `getAvailableDatesService()` for date picker
- [x] Controller functions for each formula type
- [x] API routes with master role protection
- [x] Proper error handling and validation

### Frontend TO DO
- [ ] Create date picker component
- [ ] Call `/available-dates` endpoint on mount
- [ ] Pass date parameter to formula endpoints
- [ ] Display both `latest_date` and `queried_date` in UI
- [ ] Add role check (show historical data only for masters)
- [ ] Add loading and error states
- [ ] Format dates properly (YYYY-MM-DD)

## Frontend Integration Example

```typescript
// Components/FormulaHistorical.tsx (Example)
import React, { useState, useEffect } from 'react';

export const FormulaHistorical = () => {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useContext(AuthContext);

  // Check if user is master
  if (user?.role !== 'master') {
    return <div>Access Denied: Master role required</div>;
  }

  // Load available dates
  useEffect(() => {
    const loadDates = async () => {
      const response = await fetch('/api/formula/available-dates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ formulaType: 'rally-attempt', limit: 30 })
      });
      const result = await response.json();
      if (result.success) setDates(result.dates);
    };
    loadDates();
  }, []);

  // Load data for selected date
  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    try {
      const response = await fetch('/api/formula/rally-attempt-by-date', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date, currentPage: 1, itemsPerPage: 10 })
      });
      const result = await response.json();
      if (result.success) setData(result.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select onChange={(e) => handleDateChange(e.target.value)}>
        <option value="">Select Date</option>
        {dates.map(date => (
          <option key={date} value={date}>{date}</option>
        ))}
      </select>
      
      {loading && <p>Loading...</p>}
      {data.length > 0 && <RallyAttemptTable data={data} />}
    </div>
  );
};
```

## Database Query Performance

### Indexes Used
- `idx_rally_symbol` - Fast symbol lookups
- `idx_rally_date` - Fast date range queries
- `idx_rally_symbol_date` - Combined index for common filters

### Optimization Tips
1. Use pagination (itemsPerPage: 10-20 recommended)
2. For large date ranges, add additional filters (symbol, searchTerm)
3. Distinct dates query uses database function for efficiency

## Troubleshooting

### No dates returned
- Check if formula data is being generated (run formula engine first)
- Verify formulas are configured to run automatically

### 403 Forbidden error
- Verify token contains `role: 'master'`
- Check JWT_SECRET is consistent

### Empty data for valid date
- Date format must be YYYY-MM-DD
- Date must have data in database (run formula engine first)
- Use `/available-dates` to confirm date exists

## Files Modified

1. ✅ `src/middlewares/rbac.middleware.js` - **CREATED** (NEW)
2. ✅ `src/services/formulaService.js` - Modified (buildFormulaQuery, added getAvailableDatesService)
3. ✅ `src/controllers/formulaController.js` - Enhanced (6 new endpoints + getAvailableDates)
4. ✅ `src/routes/formulaRoutes.js` - Updated (7 new routes with RBAC)

## Migration Notes

- **Backward Compatible**: All existing endpoints continue to work unchanged
- **Optional Parameter**: `specificDate` is optional; omitting it returns latest date data
- **No Schema Changes**: Uses existing date fields in models

## Testing

### Unit Test Example
```javascript
// Test available dates
const response = await request(app)
  .post('/api/formula/available-dates')
  .set('Authorization', `Bearer ${masterToken}`)
  .send({ formulaType: 'rally-attempt', limit: 30 });

expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.dates).toBeInstanceOf(Array);
```

### Integration Test Example
```javascript
// Test historical data retrieval
const response = await request(app)
  .post('/api/formula/rally-attempt-by-date')
  .set('Authorization', `Bearer ${masterToken}`)
  .send({ date: '2024-01-15', currentPage: 1 });

expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.queried_date).toBe('2024-01-15');
```
