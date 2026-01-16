// models/ffix.js
export default function FFIXModel(sequelize, DataTypes) {
  return sequelize.define('ffix', {
    INDEX_FLG: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SYMBOL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SERIES: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ISSUE_CAP: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    INVESTIBLE_FACTOR: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    CLOSE_PRIC: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    FF_MKT_CAP: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    WEIGHTAGE: {
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
    tableName: 'ffix',
    timestamps: false,
  });
}
