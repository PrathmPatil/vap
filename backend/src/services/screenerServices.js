import {
  BalanceSheet,
  CashFlow,
  Companies,
  CompanyFinancials,
  ProfitLoss,
  QuarterlyResults,
  Ratios,
  Shareholding,
  UnknownSection
} from '../models/index.js';
import { Op, fn, col, where, Sequelize } from 'sequelize';

export const screenerDataServices = async (symbol) => {
  try {
    const models = [
      BalanceSheet,
      CashFlow,
      Ratios,
      QuarterlyResults,
      Shareholding,
      Companies,
      CompanyFinancials, 
      ProfitLoss, 
      UnknownSection 
    ];

    const data = {};

    await Promise.all(
      models.map(async (model) => {
        const records = await model.findAll({
          where: { symbol },
          raw: true
        });

        let processedRecords = [];

        if (records.some((r) => 'col_unknown' in r)) {
          const uniqueRecordsMap = new Map();
          records.forEach((row) => {
            if (row.col_unknown && !uniqueRecordsMap.has(row.col_unknown)) {
              const cleanedRow = Object.fromEntries(
                Object.entries(row).filter(
                  ([, value]) => value !== null && value !== ''
                )
              );
              uniqueRecordsMap.set(row.col_unknown, cleanedRow);
            }
          });
          processedRecords = Array.from(uniqueRecordsMap.values());
        }
        else if (model.name === 'company_financials') {
          processedRecords = records.map((row) => ({
            metric: row.metric,
            year: row.year,
            value: row.value
          }));
        }
        else if (model.name === 'profit_loss_profit_loss') {
          processedRecords = records.map((row) => ({
            col1: row.col1,
            col2: row.col2
          }));
        }
        else if (model.name === 'other_data_unknown_section') {
          processedRecords = records.map((row) => ({
            key: row.key,
            value: row.value
          }));
        }
        else {
          processedRecords = records.map((row) =>
            Object.fromEntries(
              Object.entries(row).filter(
                ([, value]) => value !== null && value !== ''
              )
            )
          );
        }
        
        const correctKey = {
          cash_flow_cash_flow: 'cash_flow',
          OtherDataRatios: 'other_data_ratios',
          ShareholdingPattern: 'shareholding_pattern',
          quarterly_results_quarterly_results: 'quarterly_results',
          balance_sheet_balance_sheet: 'balance_sheet',
          profit_loss_profit_loss: 'profit_loss',
          companies: 'companies',
          company_financials: 'company_financials',
          other_data_unknown_section: 'other_data_unknown_section'
        };

        const finalKey = correctKey[model.name];
        if (finalKey) data[finalKey] = processedRecords;
      })
    );

    return data;
  } catch (error) {
    console.error('Error in screenerDataServices:', error);
    throw error;
  }
};

// export const screenerDataServices = async (symbol) => {
//   try {
//     const models = [
//       BalanceSheet,
//       CashFlow,
//       Ratios,
//       QuarterlyResults,
//       Shareholding,
//       Companies,
//       CompanyFinancials,
//       ProfitLoss,
//     ];

//     const data = {};

//     await Promise.all(
//       models.map(async (model) => {
//         const records = await model.findAll({
//           where: { symbol },
//           raw: true,
//         });
//         console.log(`Fetched ${records.length} rows from ${model.name}`);
//         console.log(records);
//         const uniqueRecordsMap = new Map();
//         records.forEach((row) => {
//           if (row.col_unknown && !uniqueRecordsMap.has(row.col_unknown)) {
//             const cleanedRow = Object.fromEntries(
//               Object.entries(row).filter(
//                 ([key, value]) => value !== null && value !== ""
//               )
//             );
//             uniqueRecordsMap.set(row.col_unknown, cleanedRow);
//           }
//         });

//         const uniqueRecords = Array.from(uniqueRecordsMap.values());
//         console.log(`Filtered rows in ${model.name}: ${uniqueRecords.length}`);
//         let correctKey={"cash_flow_cash_flow":"cash_flow","OtherDataRatios":"other_data_ratios", "ShareholdingPattern":"shareholding_pattern", "cash_flow_cash_flow":"cash_flow","quarterly_results_quarterly_results":"quarterly_results","balance_sheet_balance_sheet":"balance_sheet","profit_loss_profit_loss":"profit_loss","companies":"companies","company_financials":"company_financials","profit_loss_profit_loss":"profit_loss"}

//         const finalKey=correctKey[model.name];
//         data[finalKey] = uniqueRecords;
//       })
//     );

//     return data;

//   } catch (error) {
//     console.error("Error in screenerDataServices:", error);
//     throw error;
//   }
// };
