import mysql from 'mysql2/promise';
import { resolveStockDbName } from './dbEnv.js';

/**
 * Automatic schema fixes that run on backend startup (no manual SQL needed).
 */
export async function runStartupMigrations(config) {
  const database = resolveStockDbName();
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database,
    port: config.port || 3306,
  });

  try {
    await ensureScreenerCompaniesTable(connection);
    await ensureVolumeBreakoutIndex(connection);
    await ensureStrongBullishSymbolColumn(connection);
  } finally {
    await connection.end();
  }
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `
    SELECT COUNT(*) AS cnt
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    `,
    [tableName]
  );
  return rows[0]?.cnt > 0;
}

async function columnExists(connection, tableName, columnName) {
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
  return rows[0]?.cnt > 0;
}

/**
 * Prevent screener EAV `companies` from colliding with YFinance `companies` profile table.
 */
async function ensureScreenerCompaniesTable(connection) {
  const legacy = 'companies';
  const target = 'screener_company_parameters';

  const legacyExists = await tableExists(connection, legacy);
  const targetExists = await tableExists(connection, target);

  if (legacyExists && !targetExists) {
    const hasParameter = await columnExists(connection, legacy, 'parameter');
    const hasName = await columnExists(connection, legacy, 'name');

    if (hasParameter && !hasName) {
      await connection.execute(
        `RENAME TABLE \`${legacy}\` TO \`${target}\``
      );
      console.log(`✅ Renamed ${legacy} → ${target} (screener EAV)`);
      return;
    }
  }

  if (!targetExists) {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`${target}\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        parameter VARCHAR(100) NOT NULL,
        value VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log(`✅ Ensured ${target} table exists`);
  }
}

async function ensureStrongBullishSymbolColumn(connection) {
  if (!(await tableExists(connection, 'strong_bullish_candle'))) return;
  if (await columnExists(connection, 'strong_bullish_candle', 'symbol')) return;

  await connection.execute(`
    ALTER TABLE \`strong_bullish_candle\`
    ADD COLUMN \`symbol\` VARCHAR(50) NULL AFTER \`security\`
  `);
  console.log('✅ Added strong_bullish_candle.symbol');
}

async function ensureVolumeBreakoutIndex(connection) {
  if (!(await tableExists(connection, 'volume_breakout'))) {
    return;
  }

  const [indexes] = await connection.execute(`
    SHOW INDEX FROM \`volume_breakout\` WHERE Key_name = 'idx_volume_breakout_security_date'
  `);

  if (!indexes.length) {
    try {
      await connection.execute(`
        CREATE INDEX idx_volume_breakout_security_date
        ON \`volume_breakout\` (security(191), trade_date)
      `);
      console.log('✅ Added volume_breakout dedup index');
    } catch (error) {
      if (!String(error.message).includes('Duplicate')) {
        console.warn(`⚠️ volume_breakout index: ${error.message}`);
      }
    }
  }
}
