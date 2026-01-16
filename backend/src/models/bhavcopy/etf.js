// models/etf.js
export default function ETFModel(sequelize, DataTypes) {
  return sequelize.define('etf', {
    MARKET: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SERIES: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SYMBOL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    previous_close_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'PREVIOUS CLOSE PRICE',
    },
    open_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'OPEN PRICE',
    },
    high_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'HIGH PRICE',
    },
    low_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'LOW PRICE',
    },
    close_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'CLOSE PRICE',
    },
    net_traded_value: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'NET TRADED VALUE',
    },
    net_traded_qty: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'NET TRADED QTY',
    },
    trades: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'TRADES',
    },
    week_52_high: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: '52 WEEK HIGH',
    },
    week_52_low: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: '52 WEEK LOW',
    },
    UNDERLYING: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'etf',
    timestamps: false,
  });
}
