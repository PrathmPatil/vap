# Formula Cron Job Documentation

## Overview

This document describes the **Formula Cron Job** system that automatically calculates and stores formula data in the database at scheduled intervals instead of running these calculations synchronously when the frontend calls the API.

---

## 📋 Problem Statement

**Before Cron Job:**
- When the frontend calls a formula API (e.g., `/vap/formula/strong-bullish-candle`), the backend immediately runs the calculation
- Complex formula calculations take significant time (30 seconds - 5+ minutes)
- Frontend users experience long loading times and potential timeouts
- Server resources are blocked during calculation

**After Cron Job:**
- Calculations run automatically at **11 PM every day**
- Results are pre-computed and stored in the database
- Frontend API calls retrieve cached data immediately
- Users get instant responses with no waiting time
- Server resources are available for other operations

---

## ✨ Features

✅ **Automatic Scheduling** - Runs at 11 PM daily  
✅ **All Formula Types** - Rally Attempt, Follow Through Day, Buy Day, Strong Bullish, Volume Breakouts, Tweezer Bottom  
✅ **Logging & Monitoring** - All executions logged to database  
✅ **Error Handling** - Graceful error handling with detailed logs  
✅ **Manual Control** - APIs to start/stop cron jobs manually  
✅ **Admin Dashboard Ready** - REST APIs for monitoring and management  

---

## 🗂️ File Structure

```
backend/src/
├── crons/
│   ├── formulaCron.js              # Main cron job implementation
│   └── cronUtils.js                # Utility functions for cron management
├── controllers/
│   └── cronManagementController.js # APIs for cron management
├── routes/
│   └── cronManagementRoutes.js     # Routes for cron management
└── index.js                        # Main server file (updated)
```

---

## ⏰ Cron Job Details

### Execution Time
- **Time**: 11:00 PM (23:00) every day
- **Cron Expression**: `0 23 * * *`
- **Timezone**: Server timezone (modify in `formulaCron.js` if needed)

### Formulas Executed

The cron job executes 7 different formula calculations in sequence:

1. **Formula Engine** - Comprehensive analysis
2. **Rally Attempt Day** - Detects rally patterns
3. **Follow Through Day** - Identifies follow-through signals
4. **Buy Day** - Finds buy signals
5. **Strong Bullish Candles** - Detects strong bullish patterns
6. **Volume Breakouts** - Identifies volume breakouts
7. **Tweezer Bottom Patterns** - Detects tweezer bottom formations

### Data Flow

```
Cron Job (11 PM)
    ↓
Execute All Formulas
    ↓
Store Results in Database
    ↓
Log Execution Status
    ↓
Frontend API calls return cached data instantly
```

---

## 🚀 How to Use

### 1. Automatic Initialization

The cron job is automatically started when the server starts. No additional configuration needed!

When you start the backend:
```bash
npm run dev
# or
npm start
```

The cron job initializes automatically and logs:
```
✨ Formula Cron Job scheduled at 11 PM every day (0 23 * * *)
```

### 2. Manual Trigger (Testing)

Use these APIs to test or manually trigger the cron job:

#### Start Formula Cron Manually
```bash
POST /vap/cron-management/start-formula-cron

Response:
{
  "success": true,
  "message": "Formula cron started",
  "data": {
    "active_jobs": ["formula_cron"],
    "total": 1
  }
}
```

#### Get Active Cron Jobs
```bash
GET /vap/cron-management/active-jobs

Response:
{
  "success": true,
  "data": {
    "active_jobs": ["formula_cron"],
    "total": 1
  }
}
```

#### Get Cron Logs
```bash
POST /vap/cron-management/logs

Body:
{
  "limit": 10,
  "job_name": "formula_calculation_job"  // optional
}

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "job_name": "formula_calculation_job",
      "status": "completed",
      "start_time": "2025-05-05T23:00:00.000Z",
      "end_time": "2025-05-05T23:05:30.000Z",
      "details": "Successfully executed all formula calculations..."
    }
  ]
}
```

#### Get Last Execution
```bash
GET /vap/cron-management/last-execution?job_name=formula_calculation_job

Response:
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

#### Stop Cron Job
```bash
POST /vap/cron-management/stop-cron

Body:
{
  "job_name": "formula_cron"
}

Response:
{
  "success": true,
  "message": "Stopped: formula_cron",
  "data": {
    "active_jobs": [],
    "total": 0
  }
}
```

#### Validate Cron Expression
```bash
POST /vap/cron-management/validate-expression

Body:
{
  "expression": "0 23 * * *"
}

Response:
{
  "success": true,
  "valid": true,
  "expression": "0 23 * * *",
  "message": "Valid cron expression"
}
```

---

## 🔧 Customization

### Change Execution Time

Edit [formulaCron.js](./formulaCron.js) and update the cron expression:

```javascript
// Current: 11 PM every day
const cronExpression = '0 23 * * *';

// Change to your preferred time
const cronExpression = '0 9 * * *';  // 9 AM
```

### Common Cron Expressions

| Expression | Meaning |
|-----------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour at minute 0 |
| `0 23 * * *` | 11 PM every day ⭐ |
| `0 9 * * *` | 9 AM every day |
| `0 0 * * *` | 12 AM (midnight) |
| `0 9 * * 1` | 9 AM every Monday |
| `30 4 * * 5` | 4:30 AM every Friday |
| `0 0 1 * *` | 12 AM on the 1st of every month |

### Skip Specific Formula

Edit [formulaCron.js](./formulaCron.js) and comment out any formula section:

```javascript
// Skip Rally Attempt Day
/*
try {
  console.log('⏳ Generating Rally Attempt Day patterns...');
  // ... rally attempt code ...
} catch (error) {
  // ... error handling ...
}
*/
```

### Adjust Error Handling

Modify error handling in [formulaCron.js](./formulaCron.js):

```javascript
catch (error) {
  console.error('❌ Formula Error:', error.message);
  executedFormulas.push({
    formula: 'Formula Name',
    status: 'failed',
    error: error.message
  });
  totalErrors++;
  
  // Send notification, email, or Slack alert
  // Example: await notifyAdmin(error);
}
```

---

## 📊 Monitoring & Logging

### View Cron Logs in Database

The `CronLogModel` table stores all cron job executions:

```sql
SELECT * FROM cron_logs 
WHERE job_name = 'formula_calculation_job' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Log Fields

| Field | Description |
|-------|-------------|
| `id` | Unique log ID |
| `job_name` | Name of the cron job |
| `status` | `completed`, `failed`, or `in_progress` |
| `start_time` | When execution started |
| `end_time` | When execution ended |
| `details` | JSON with execution details and formula stats |
| `created_at` | When log was created |
| `updated_at` | When log was last updated |

### Console Logs

When cron job runs, you'll see console output like:

```
🚀 ============================================
🚀 FORMULA CRON JOB STARTED AT 11 PM
🚀 ============================================

⏳ Running Complete Formula Engine...
✅ Formula Engine completed: 500 symbols processed

⏳ Generating Rally Attempt Day patterns...
✅ Rally Attempt Day completed: 25 records

... (more formulas)

✅ ============================================
✅ FORMULA CRON JOB COMPLETED
✅ Total Records Processed: 1250
✅ Total Errors: 0
✅ Duration: 315000ms (315.00s)
✅ ============================================
```

---

## 🛡️ Security Considerations

### Before Production Deployment

1. **Add Authentication Middleware** to cron management routes:

```javascript
// In cronManagementRoutes.js
import { isAdmin } from '../middlewares/auth.middleware.js';

router.post('/start-formula-cron', isAdmin, startFormulaCronManual);
router.post('/stop-cron', isAdmin, stopCronJobManual);
// ... other routes
```

2. **Rate Limiting** for manual trigger API:

```javascript
import rateLimit from 'express-rate-limit';

const cronLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 requests per window
  message: 'Too many cron requests'
});

router.post('/start-formula-cron', cronLimiter, startFormulaCronManual);
```

3. **Logging & Alerts**:
   - Log all manual cron job triggers
   - Set up alerts for failures
   - Monitor execution times

---

## 🐛 Troubleshooting

### Cron Job Not Running

1. Check if cron is initialized in server logs
2. Verify `node-cron` is installed: `npm list node-cron`
3. Check server timezone settings
4. Verify database connection is active

### Cron Job Fails

1. Check database logs for errors
2. Verify all formula services are working
3. Check available disk space and memory
4. Review detailed error in `CronLogModel` table

### Performance Issues

1. Add more specific date filtering to reduce data processing
2. Split formulas into separate cron jobs
3. Increase server resources (RAM, CPU)
4. Optimize database queries and add indexes

---

## 📝 Development Notes

### Testing the Cron Job

To test without waiting 11 PM, temporarily change cron expression:

```javascript
// Test every 5 minutes
const cronExpression = '*/5 * * * *';

// After testing, revert to production time
const cronExpression = '0 23 * * *';
```

### Performance Monitoring

Add performance metrics to [formulaCron.js](./formulaCron.js):

```javascript
const startTime = new Date();
console.time('Formula Execution');

// ... formula execution ...

console.timeEnd('Formula Execution');
const duration = new Date() - startTime;
console.log(`⏱️ Total Duration: ${duration}ms`);
```

### Adding New Formulas

When adding new formula calculations:

1. Create formula service in `services/formulaService.js`
2. Add execution block in [formulaCron.js](./formulaCron.js)
3. Add logging and error handling
4. Update documentation

---

## 📞 Support

For issues or questions:
1. Check the logs in database
2. Review console output when cron runs
3. Test individual formulas manually first
4. Check forum/documentation for node-cron issues

---

## 📚 References

- [node-cron Documentation](https://github.com/kelektiv/node-cron)
- [Cron Expression Guide](https://crontab.guru/)
- Project formula services documentation

---

**Last Updated**: May 5, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
