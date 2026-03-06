
// mysql> desc market_status;
// +------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | Field      | Type         | Null | Key | Default           | Extra                                         |
// +------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | id         | int          | NO   | PRI | NULL              | auto_increment                                |
// | exchange   | varchar(255) | YES  | UNI | NULL              |                                               |
// | holiday    | varchar(255) | YES  |     | NULL              |                                               |
// | isOpen     | tinyint(1)   | YES  |     | NULL              |                                               |
// | session    | varchar(255) | YES  |     | NULL              |                                               |
// | t          | bigint       | YES  |     | NULL              |                                               |
// | timezone   | varchar(255) | YES  |     | NULL              |                                               |
// | created_at | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
// | updated_at | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
// +------------+--------------+------+-----+-------------------+-----------------------------------------------+
// 9 rows in set (1.02 sec)

// mysql> desc market_holiday;
// +-------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | Field       | Type         | Null | Key | Default           | Extra                                         |
// +-------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | id          | int          | NO   | PRI | NULL              | auto_increment                                |
// | eventName   | varchar(255) | YES  | MUL | NULL              |                                               |
// | atDate      | date         | YES  |     | NULL              |                                               |
// | tradingHour | varchar(255) | YES  |     | NULL              |                                               |
// | postMarket  | varchar(255) | YES  |     | NULL              |                                               |
// | created_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
// | updated_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
// +-------------+--------------+------+-----+-------------------+-----------------------------------------------+
// 7 rows in set (0.13 sec)

// mysql> desc ipo_calendar;
// +------------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | Field            | Type         | Null | Key | Default           | Extra                                         |
// +------------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | id               | int          | NO   | PRI | NULL              | auto_increment                                |
// | date             | date         | YES  |     | NULL              |                                               |
// | exchange         | varchar(255) | YES  |     | NULL              |                                               |
// | name             | varchar(255) | YES  |     | NULL              |                                               |
// | numberOfShares   | bigint       | YES  |     | NULL              |                                               |
// | price            | varchar(255) | YES  |     | NULL              |                                               |
// | status           | varchar(255) | YES  |     | NULL              |                                               |
// | symbol           | varchar(255) | YES  | MUL | NULL              |                                               |
// | totalSharesValue | bigint       | YES  |     | NULL              |                                               |
// | created_at       | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
// | updated_at       | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
// +------------------+--------------+------+-----+-------------------+-----------------------------------------------+
// 11 rows in set (0.14 sec)

// mysql> desc earnings_calendar;
// +-----------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | Field           | Type         | Null | Key | Default           | Extra                                         |
// +-----------------+--------------+------+-----+-------------------+-----------------------------------------------+
// | id              | int          | NO   | PRI | NULL              | auto_increment                                |
// | date            | date         | YES  |     | NULL              |                                               |
// | epsActual       | varchar(255) | YES  |     | NULL              |                                               |
// | epsEstimate     | double       | YES  |     | NULL              |                                               |
// | hour            | varchar(255) | YES  |     | NULL              |                                               |
// | quarter         | bigint       | YES  |     | NULL              |                                               |
// | revenueActual   | varchar(255) | YES  |     | NULL              |                                               |
// | revenueEstimate | bigint       | YES  |     | NULL              |                                               |
// | symbol          | varchar(255) | YES  | MUL | NULL              |                                               |
// | year            | bigint       | YES  |     | NULL              |                                               |
// | created_at      | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
// | updated_at      | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
// +-----------------+--------------+------+-----+-------------------+-----------------------------------------------+
// 12 rows in set (0.14 sec)

// mysql>
import { Sequelize, DataTypes } from 'sequelize';
import { sequelizeStockMarket as sequelize } from './index.js';

const MarketStatus = sequelize.define(
  "MarketStatus",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    exchange: {
      type: DataTypes.STRING(255),
      unique: true,
    },
    holiday: {
      type: DataTypes.STRING(255),
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
    },
    session: {
      type: DataTypes.STRING(255),
    },
    t: {
      type: DataTypes.BIGINT,
    },
    timezone: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "market_status",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const MarketHoliday = sequelize.define(
  "MarketHoliday",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eventName: {
      type: DataTypes.STRING(255),
    },
    atDate: {
      type: DataTypes.DATEONLY,
    },
    tradingHour: {
      type: DataTypes.STRING(255),
    },
    postMarket: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "market_holiday",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["eventName", "atDate"],
      },
    ],
  }
);

const IPOCalendar = sequelize.define(
  "IPOCalendar",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
    },
    exchange: {
      type: DataTypes.STRING(255),
    },
    name: {
      type: DataTypes.STRING(255),
    },
    numberOfShares: {
      type: DataTypes.BIGINT,
    },
    price: {
      type: DataTypes.STRING(255),
    },
    status: {
      type: DataTypes.STRING(255),
    },
    symbol: {
      type: DataTypes.STRING(255),
    },
    totalSharesValue: {
      type: DataTypes.BIGINT,
    },
  },
  {
    tableName: "ipo_calendar",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["symbol", "date"],
      },
    ],
  }
);

const EarningsCalendar = sequelize.define(
  "EarningsCalendar",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
    },
    epsActual: {
      type: DataTypes.STRING(255),
    },
    epsEstimate: {
      type: DataTypes.DOUBLE,
    },
    hour: {
      type: DataTypes.STRING(255),
    },
    quarter: {
      type: DataTypes.BIGINT,
    },
    revenueActual: {
      type: DataTypes.STRING(255),
    },
    revenueEstimate: {
      type: DataTypes.BIGINT,
    },
    symbol: {
      type: DataTypes.STRING(255),
    },
    year: {
      type: DataTypes.BIGINT,
    },
  },
  {
    tableName: "earnings_calendar",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["symbol", "date", "quarter", "year"],
      },
    ],
  }
);


export { MarketStatus, MarketHoliday, IPOCalendar, EarningsCalendar };