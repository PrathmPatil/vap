# 🧪 Formula Cron Job - Testing Guide

## Quick Start Testing

### 1. Start Your Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

You should see in console:
```
✨ Formula Cron Job scheduled at 11 PM every day (0 23 * * *)
```

---

## 🧬 Testing Different Scenarios

### Scenario 1: Check if Cron is Running

**Request:**
```bash
curl -X GET http://localhost:8000/vap/cron-management/active-jobs
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "active_jobs": ["formula_cron"],
    "total": 1
  }
}
```

---

### Scenario 2: Test Cron Execution (Every 5 Minutes)

**For quick testing, temporarily modify the cron expression:**

Edit `backend/src/crons/formulaCron.js`:

```javascript
// Change from:
const cronExpression = '0 23 * * *';

// To (every 5 minutes):
const cronExpression = '*/5 * * * *';

// Save and restart server
npm run dev
```

Now the cron will run every 5 minutes. Check console logs for execution.

**After testing, change back to:**
```javascript
const cronExpression = '0 23 * * *';  // 11 PM daily
```

---

### Scenario 3: Check Cron Logs

**Request:**
```bash
curl -X POST http://localhost:8000/vap/cron-management/logs \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 5,
    "job_name": "formula_calculation_job"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "job_name": "formula_calculation_job",
      "status": "completed",
      "start_time": "2025-05-05T23:00:00.000Z",
      "end_time": "2025-05-05T23:05:30.000Z",
      "details": "Successfully executed all formula calculations. Total records processed: 1250. Total errors: 0. Formulas executed: [...]"
    }
  ],
  "count": 1
}
```

---

### Scenario 4: Check Last Execution Status

**Request:**
```bash
curl -X GET "http://localhost:8000/vap/cron-management/last-execution?job_name=formula_calculation_job"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "job_name": "formula_calculation_job",
    "status": "completed",
    "start_time": "2025-05-05T23:00:00.000Z",
    "end_time": "2025-05-05T23:05:30.000Z"
  }
}
```

---

### Scenario 5: Validate a Cron Expression

**Request:**
```bash
curl -X POST http://localhost:8000/vap/cron-management/validate-expression \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "0 23 * * *"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "valid": true,
  "expression": "0 23 * * *",
  "message": "Valid cron expression"
}
```

**Test Invalid Expression:**
```bash
curl -X POST http://localhost:8000/vap/cron-management/validate-expression \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "invalid cron"
  }'
```

**Response:**
```json
{
  "success": true,
  "valid": false,
  "expression": "invalid cron",
  "message": "Invalid cron expression"
}
```

---

## 📊 Testing Using Postman

### 1. Create New Postman Collection

- Open Postman
- Create new collection: "Formula Cron Tests"

### 2. Add Requests

#### Request 1: Get Active Jobs
- **Method:** GET
- **URL:** `http://localhost:8000/vap/cron-management/active-jobs`

#### Request 2: Get Cron Logs
- **Method:** POST
- **URL:** `http://localhost:8000/vap/cron-management/logs`
- **Body (JSON):**
```json
{
  "limit": 10,
  "job_name": "formula_calculation_job"
}
```

#### Request 3: Get Last Execution
- **Method:** GET
- **URL:** `http://localhost:8000/vap/cron-management/last-execution?job_name=formula_calculation_job`

#### Request 4: Validate Cron Expression
- **Method:** POST
- **URL:** `http://localhost:8000/vap/cron-management/validate-expression`
- **Body (JSON):**
```json
{
  "expression": "0 23 * * *"
}
```

#### Request 5: Start Formula Cron (Manual)
- **Method:** POST
- **URL:** `http://localhost:8000/vap/cron-management/start-formula-cron`

#### Request 6: Stop Cron
- **Method:** POST
- **URL:** `http://localhost:8000/vap/cron-management/stop-cron`
- **Body (JSON):**
```json
{
  "job_name": "formula_cron"
}
```

---

## 🔍 Checking Database Logs

### View Cron Execution Logs

If you're using MySQL/PostgreSQL:

```sql
SELECT * FROM cron_logs 
WHERE job_name = 'formula_calculation_job' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Formula Results

After cron execution, verify data in formula tables:

```sql
-- Check Rally Attempt Day
SELECT COUNT(*) as rally_count FROM rally_attempt_day WHERE DATE(rally_date) = CURDATE();

-- Check Follow Through Day
SELECT COUNT(*) as ftd_count FROM follow_through_day WHERE DATE(ftd_date) = CURDATE();

-- Check Buy Day
SELECT COUNT(*) as buy_day_count FROM buy_day WHERE DATE(buy_date) = CURDATE();

-- Check Strong Bullish Candles
SELECT COUNT(*) as bullish_count FROM strong_bullish_candles WHERE DATE(bullish_date) = CURDATE();
```

---

## 📋 Test Checklist

- [ ] **Cron Initialization**
  - Server starts without errors
  - Console shows cron scheduled message
  - Active jobs returns 1 job

- [ ] **Cron Execution**
  - Set to run every 5 minutes
  - Wait 5 minutes
  - Check console for execution logs
  - Verify database records are created

- [ ] **Database Logging**
  - Check `cron_logs` table for entry
  - Status is 'completed'
  - Details contain formula results

- [ ] **API Endpoints**
  - GET active-jobs returns correct data
  - POST logs returns execution history
  - GET last-execution shows most recent run
  - POST validate-expression works correctly

- [ ] **Error Handling**
  - Stop cron and verify it stops
  - Restart cron and verify it starts
  - Check error logs for any issues

- [ ] **Performance**
  - Monitor CPU/Memory during execution
  - Check execution time is reasonable
  - Verify no duplicate records created

---

## 🔧 Debug Mode

### Enable Detailed Logging

Edit `backend/src/crons/formulaCron.js` and add:

```javascript
// Add at the top of startFormulaCron function
const DEBUG = true;

if (DEBUG) {
  console.log('🔍 DEBUG: Cron job starting...');
  console.log('🔍 DEBUG: Cron expression:', cronExpression);
  console.log('🔍 DEBUG: Current time:', new Date());
}
```

### Add Performance Timing

```javascript
console.time('Rally Attempt');
const rallyResult = await generateRallyAttemptService(...);
console.timeEnd('Rally Attempt');
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Cron Never Executes

**Solution:**
1. Check timezone in server: `console.log(new Date().toString())`
2. Verify cron expression at [crontab.guru](https://crontab.guru/)
3. Check if `node-cron` is installed: `npm list node-cron`

### Issue 2: Formulas Taking Too Long

**Solution:**
1. Check database performance
2. Add database indexes
3. Filter data by date range to reduce processing
4. Split into multiple cron jobs

### Issue 3: No Logs in Database

**Solution:**
1. Verify `CronLogModel` is initialized
2. Check database connection
3. Check if `cron_logs` table exists
4. Verify Sequelize sync is working

### Issue 4: Duplicate Records

**Solution:**
1. Add unique indexes to formula tables
2. Check for duplicate logic in formula services
3. Verify cron job isn't running multiple times

---

## 📈 Performance Benchmarks

Expected execution times (varies by data size):

| Formula | Typical Time | Max Records |
|---------|-------------|------------|
| Rally Attempt | 30-60s | 100-500 |
| Follow Through | 45-90s | 50-300 |
| Buy Day | 60-120s | 30-200 |
| Strong Bullish | 30-60s | 100-500 |
| Volume Breakouts | 20-40s | 50-300 |
| Tweezer Bottom | 15-30s | 20-100 |
| **Total** | **3-7 min** | **350-2000** |

---

## ✅ Final Verification

Run this checklist before going to production:

- [ ] Cron runs automatically at 11 PM
- [ ] All formulas execute successfully
- [ ] Database records are created correctly
- [ ] Error handling works properly
- [ ] Logs are stored in database
- [ ] Admin can monitor via API
- [ ] Performance is acceptable
- [ ] No duplicate data issues
- [ ] Security middleware is added
- [ ] Documentation is complete

---

**Happy Testing! 🚀**
