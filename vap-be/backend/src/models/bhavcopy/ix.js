// models/ix.js
export default function IXModel(sequelize, DataTypes) {
  return sequelize.define('ix', {
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
    CLOSE_PRIC: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    MKT_CAP: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    WEIGHTAGE: {
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
    tableName: 'ix',
    timestamps: false,
  });
}
