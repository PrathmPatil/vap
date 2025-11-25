import express from 'express';
import {
    AllCompaniesData,
    ListedCompanies
} from '../models/index.js';
import { Op, fn, literal, col, where } from 'sequelize';
import listed_companies from '../models/listed_companies.js';


const router = express.Router();

// Rally attempt day 
function checkRallyAttemptDay(data) {
    let results = [];

    const grouped = data.reduce((acc, row) => {
        if (!acc[row.symbol]) acc[row.symbol] = [];
        acc[row.symbol].push(row);
        return acc;
    }, {});

    for (let symbol in grouped) {
        let companyData = grouped[symbol];
        if (companyData.length < 2) continue;

        let today = companyData[companyData.length - 1];
        let prev = companyData[companyData.length - 2];

        let cond1 = today.close > today.open * 1.02;
        let cond2 = today.close > prev.close;
        let cond3 = today.open < prev.close;
        let cond4 = today.volume > prev.volume * 1.5;
        let cond5 = (today.high - today.close) / today.high <= 0.01;

        if (cond1 && cond2 && cond3 && cond4 && cond5) {
            results.push({
                symbol: today.symbol,
                date: today.date,
                close: today.close,
                open: today.open,
                volume: today.volume
            });
        }
    }

    return results;
}
/**
 * Follow Through Day check
 * (Example placeholder logic — replace with your own rules)
 */
function checkFollowThroughDay(data) {
    // Placeholder: mark every 5th day after rally attempt as FTD
    let results = [];
    const grouped = data.reduce((acc, row) => {
        if (!acc[row.symbol]) acc[row.symbol] = [];
        acc[row.symbol].push(row);
        return acc;
    }, {});

    for (let symbol in grouped) {
        let companyData = grouped[symbol];
        for (let i = 5; i < companyData.length; i += 10) {
            results.push({ symbol, date: companyData[i].date });
        }
    }
    return results;
}

/**
 * Buy Day check
 * (Example placeholder logic — replace with your own rules)
 */
function checkBuyDay(data) {
    // Placeholder: mark any day where close > 1.05 * open
    let results = [];
    data.forEach(row => {
        if (row.close > row.open * 1.05) {
            results.push({ symbol: row.symbol, date: row.date });
        }
    });
    return results;
}

// router.get('/:symbol', async (req, res) => {
//     try {
//         const { page = 1, limit = 100, search = "" } = req.query;
//         const { symbol: paramSymbol } = req.params || {};

//         if (!paramSymbol) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Symbol is required in URL."
//             });
//         }

//         const offset = (page - 1) * limit;

//         let whereClause = {
//             [Op.and]: [
//                 where(fn("LOWER", fn("TRIM", col("symbol"))), {
//                     [Op.like]: paramSymbol.trim().toLowerCase()
//                 })
//             ]
//         };

//         if (search) {
//             whereClause = {
//                 ...whereClause,
//                 [Op.or]: [
//                     where(fn("LOWER", fn("TRIM", col("symbol"))), {
//                         [Op.like]: `%${search.trim().toLowerCase()}%`
//                     })
//                 ]
//             };
//         }

//         const { rows, count } = await AllCompaniesData.findAndCountAll({
//             where: whereClause,
//             limit: parseInt(limit),
//             offset: parseInt(offset),
//             order: [['date', 'ASC']] // Ensures rally attempt check works correctly
//         });

//         if (!rows.length) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No data found"
//             });
//         }

//         const rallyResults = checkRallyAttemptDay(rows);

//         res.status(200).json({
//             success: true,
//             total: count,
//             page: parseInt(page),
//             pages: Math.ceil(count / limit),
//             //   data: rows,
//             rally_attempts: rallyResults
//         });


//     } catch (err) {
//         console.error("Pagination Error:", err);
//         res.status(500).json({ success: false, error: err.message });
//     }
// });

/**
 * GET /all-companies
 * Returns RallyAttemptDay, FollowThroughDay, BuyDay
 */


// router.get('/all-companies', async (req, res) => {
//     try {
//         // Pagination (if needed)
//         const { page = 1, limit = 100 } = req.query;
//         const offset = (page - 1) * limit;

//         // Get latest record per symbol
//         const { rows, count } = await AllCompaniesData.findAndCountAll({
//             where: {
//                 date: {
//                     [Op.eq]: literal(`(
//         SELECT MAX(sub.date)
//         FROM companies_data AS sub
//         WHERE sub.symbol = AllCompaniesData.symbol
//       )`)
//                 }
//             },
//             order: [['symbol', 'ASC'], ['date', 'ASC']],
//             limit: parseInt(limit),
//             offset: parseInt(offset)
//         });


//         console.log(`🔍 Rows fetched: ${rows.length}`);
//         if (rows.length > 0) {
//             console.log("📝 Sample record:", rows[0].toJSON());
//         }

//         // No 404 — just return empty arrays
//         const rallyAttempts = checkRallyAttemptDay(rows);
//         const followThroughDays = checkFollowThroughDay(rows);
//         const buyDays = checkBuyDay(rows);

//         res.status(200).json({
//             RallyAttemptDay: rallyAttempts,
//             FollowThroughDay: followThroughDays,
//             BuyDay: buyDays
//         });

//     } catch (err) {
//         console.error("❌ Error fetching all companies:", err);
//         res.status(500).json({ success: false, error: err.message });
//     }
// });


router.get("/all-companies", async (req, res) => {
    try {
        const allSymbols = await ListedCompanies.findAll({
            attributes: ['symbol'],
            raw: true
        });

        let latestData = [];

        for (const { symbol } of allSymbols) {
            const firstRecord = await AllCompaniesData.findOne({
                where: { symbol },
                order: [['date', 'DESC']],
                raw: true
            });

            if (firstRecord) {
                latestData.push(firstRecord);
            }
        }


        if (!latestData.length) {
            return res.status(200).json({
                RallyAttemptDay: [],
                FollowThroughDay: [],
                BuyDay: [],
                checkedSymbolsCount: 0
            });
        }
        console.log(latestData.length)
        // 2. Run checks
        const rallyResults = checkRallyAttemptDay(latestData);
        const followThroughResults = checkFollowThroughDay(latestData);
        const buyDayResults = checkBuyDay(latestData);

        // 3. Count how many symbols were checked
        const checkedSymbolsCount = new Set(latestData.map(row => row.symbol)).size;

        // 4. Send response
        res.status(200).json({
            RallyAttemptDay: rallyResults,
            FollowThroughDay: followThroughResults,
            BuyDay: buyDayResults,
            checkedSymbolsCount
        });

    } catch (err) {
        console.error("Error in /all-companies:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
