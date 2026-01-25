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
      field: 'PREVIOUS_CLOSE_PRICE',
    },
    open_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'OPEN_PRICE',
    },
    high_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'HIGH_PRICE',
    },
    low_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'LOW_PRICE',
    },
    close_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'CLOSE_PRICE',
    },
    net_traded_value: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'NET_TRADED_VALUE',
    },
    net_traded_qty: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'NET_TRADED_QTY',
    },
    trades: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'TRADES',
    },
    week_52_high: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: '52_WEEK_HIGH',
    },
    week_52_low: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: '52_WEEK_LOW',
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
