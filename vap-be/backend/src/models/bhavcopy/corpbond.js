// models/corpbond.js
export default function CorpbondModel(sequelize, DataTypes) {
  return sequelize.define('corpbond', {
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
    PREV_CL_PR: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    OPEN_PRICE: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    HIGH_PRICE: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    LOW_PRICE: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    CLOSE_PRICE: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    NET_TRDVAL: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    NET_TRDQTY: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    CORP_IND: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    TRADES: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    HI_52_WK: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    LO_52_WK: {
      type: DataTypes.DOUBLE,
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
    tableName: 'corpbond',
    timestamps: false,
  });
}
