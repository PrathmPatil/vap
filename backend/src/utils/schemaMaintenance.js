import { DataTypes } from 'sequelize';
import logger from '../config/logger.js';
import {
  BuyDayModel,
  CronLogModel,
  FollowThroughDayModel,
  StrongBullishCandleModel,
  sequelizeFormula
} from '../models/index.js';

let formulaSchemaPromise = null;
let cronLogSchemaPromise = null;

const addColumnIfMissing = async (
  queryInterface,
  tableName,
  columnName,
  definition
) => {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) return;

  await queryInterface.addColumn(tableName, columnName, definition);
  logger.info(`Added missing column ${tableName}.${columnName}`);
};

const removeUniqueIndexIfPresent = async (
  queryInterface,
  tableName,
  indexName
) => {
  const indexes = await queryInterface.showIndex(tableName);
  const index = indexes.find((item) => item.name === indexName);

  if (!index || !index.unique) return;

  await queryInterface.removeIndex(tableName, indexName);
  logger.info(`Removed stale unique index ${tableName}.${indexName}`);
};

export const ensureFormulaSchema = async () => {
  if (!formulaSchemaPromise) {
    formulaSchemaPromise = (async () => {
      await StrongBullishCandleModel.sync();
      await FollowThroughDayModel.sync();
      await BuyDayModel.sync();

      const queryInterface = sequelizeFormula.getQueryInterface();

      await addColumnIfMissing(
        queryInterface,
        'strong_bullish_candle',
        'symbol',
        {
          type: DataTypes.STRING(50),
          allowNull: true
        }
      );

      await addColumnIfMissing(
        queryInterface,
        'strong_bullish_candle',
        'base_percent',
        {
          type: DataTypes.DOUBLE,
          allowNull: true
        }
      );

      await addColumnIfMissing(
        queryInterface,
        'follow_through_day',
        'security',
        {
          type: DataTypes.STRING(255),
          allowNull: true
        }
      );

      await addColumnIfMissing(queryInterface, 'buy_day', 'security', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
    })().catch((error) => {
      formulaSchemaPromise = null;
      throw error;
    });
  }

  return formulaSchemaPromise;
};

export const ensureCronLogSchema = async () => {
  if (!cronLogSchemaPromise) {
    cronLogSchemaPromise = (async () => {
      await CronLogModel.sync();

      const queryInterface = CronLogModel.sequelize.getQueryInterface();

      await queryInterface.changeColumn('cron_job_logs', 'status', {
        type: DataTypes.STRING(20),
        allowNull: true
      });

      await removeUniqueIndexIfPresent(
        queryInterface,
        'cron_job_logs',
        'cron_job_logs_job_name'
      );
    })().catch((error) => {
      cronLogSchemaPromise = null;
      throw error;
    });
  }

  return cronLogSchemaPromise;
};
