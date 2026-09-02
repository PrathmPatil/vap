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
    await ensureStrongBullishKingCandleColumns(connection);
    await ensureVolumeBreakoutRatioMinColumn(connection);
    await ensureUserSubscriptionColumn(connection);
    await ensureUserSubscriptionsTable(connection);
    await ensureRsRankBenchmarkColumns(connection);
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

async function ensureStrongBullishKingCandleColumns(connection) {
  if (!(await tableExists(connection, 'strong_bullish_candle'))) return;

  const columns = [
    ['body_percent', 'DOUBLE NULL AFTER `base_percent`'],
    ['body_to_range_percent', 'DOUBLE NULL AFTER `body_percent`'],
    ['high_price', 'DOUBLE NULL AFTER `close_price`'],
    ['low_price', 'DOUBLE NULL AFTER `high_price`'],
  ];

  for (const [name, ddl] of columns) {
    if (await columnExists(connection, 'strong_bullish_candle', name)) continue;
    await connection.execute(
      `ALTER TABLE \`strong_bullish_candle\` ADD COLUMN \`${name}\` ${ddl}`
    );
    console.log(`✅ Added strong_bullish_candle.${name}`);
  }
}

async function ensureVolumeBreakoutRatioMinColumn(connection) {
  if (!(await tableExists(connection, 'volume_breakout'))) return;
  if (await columnExists(connection, 'volume_breakout', 'volume_ratio_min')) return;

  await connection.execute(`
    ALTER TABLE \`volume_breakout\`
    ADD COLUMN \`volume_ratio_min\` FLOAT NULL DEFAULT 2 AFTER \`volume_ratio\`
  `);
  console.log('✅ Added volume_breakout.volume_ratio_min');
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

async function ensureUserSubscriptionColumn(connection) {
  if (!(await tableExists(connection, 'users'))) {
    return;
  }

  if (!(await columnExists(connection, 'users', 'is_subscribed'))) {
    await connection.execute(`
      ALTER TABLE \`users\`
      ADD COLUMN \`is_subscribed\` TINYINT(1) NOT NULL DEFAULT 0
    `);
    console.log('✅ Added users.is_subscribed column');
  }
}

async function ensureUserSubscriptionsTable(connection) {
  if (await tableExists(connection, 'user_subscriptions')) {
    return;
  }

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`user_subscriptions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NOT NULL,
      \`plan_id\` VARCHAR(20) NOT NULL,
      \`plan_name\` VARCHAR(80) NOT NULL,
      \`amount\` DECIMAL(10, 2) NOT NULL,
      \`currency\` VARCHAR(3) NOT NULL DEFAULT 'INR',
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
      \`started_at\` DATETIME NOT NULL,
      \`expires_at\` DATETIME NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_user_subscriptions_user\` (\`user_id\`),
      INDEX \`idx_user_subscriptions_user_status\` (\`user_id\`, \`status\`),
      INDEX \`idx_user_subscriptions_expires\` (\`expires_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ Ensured user_subscriptions table exists');
}

async function ensureRsRankBenchmarkColumns(connection) {
  if (!(await tableExists(connection, 'rs_rank'))) {
    return;
  }

  const columns = [
    ['rs_21_nifty', 'DOUBLE NULL'],
    ['rs_55_nifty', 'DOUBLE NULL'],
    ['rs_21_cnx500', 'DOUBLE NULL'],
    ['rs_55_cnx500', 'DOUBLE NULL'],
  ];

  for (const [name, definition] of columns) {
    if (!(await columnExists(connection, 'rs_rank', name))) {
      await connection.execute(`
        ALTER TABLE \`rs_rank\`
        ADD COLUMN \`${name}\` ${definition}
      `);
      console.log(`✅ Added rs_rank.${name} column`);
    }
  }
}
