import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import {
  resolveAnnouncementDbName,
  resolveBhavcopyDbName,
  resolveScreenerDbName,
  resolveStockDbName,
  resolveYFinanceDbName,
} from './dbEnv.js';

dotenv.config();

const baseOptions = {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306,
  logging: false,
};

const connect = (database) =>
  new Sequelize(database, process.env.DB_USER, process.env.DB_PASSWORD, baseOptions);

export const sequelizeStockMarket = connect(resolveStockDbName());
export const sequelizeBhavcopy = connect(resolveBhavcopyDbName());
export const sequelizeScreener = connect(resolveScreenerDbName());
export const sequelizeYFinanceDB = connect(resolveYFinanceDbName());
export const sequelizeIPO = connect(resolveStockDbName());
export const sequelizeAnnouncement = connect(resolveAnnouncementDbName());
