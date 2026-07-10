import mysql from 'mysql2/promise';
import { resolveStockDbName } from './dbEnv.js';

const IPO_TABLES = ['mainboard_data', 'sme_data'];
const IPO_COLUMNS = [
  'issue_status',
  'price_band',
  'issue_size_shares',
  'lot_size',
  'listing_date',
  'data_source',
  'security_type',
];

export async function ensureIpoColumns(config) {
  const database = resolveStockDbName();
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database,
    port: config.port || 3306,
  });

  try {
    for (const tableName of IPO_TABLES) {
      for (const columnName of IPO_COLUMNS) {
        const [rows] = await connection.execute(
          `
          SELECT COUNT(*) AS cnt
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
          `,
          [tableName, columnName]
        );

        if (rows[0]?.cnt === 0) {
          await connection.execute(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` TEXT NULL`
          );
          console.log(`✅ Added ${tableName}.${columnName}`);
        }
      }
    }
  } finally {
    await connection.end();
  }
}
