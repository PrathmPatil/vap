// models/pr.js
export default function PRModel(sequelize, DataTypes) {
  return sequelize.define('pr', {
    MKT: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    PREV_CL_PR: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    OPEN_PRICE: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    HIGH_PRICE: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    LOW_PRICE: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    CLOSE_PRICE: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    NET_TRDVAL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    NET_TRDQTY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IND_SEC: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    CORP_IND: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    TRADES: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    HI_52_WK: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    LO_52_WK: {
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
    tableName: 'pr',
    timestamps: false,
  });
}
