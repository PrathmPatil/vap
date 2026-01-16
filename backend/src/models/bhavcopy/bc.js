// models/bc.js
export default function BCModel(sequelize, DataTypes) {
  return sequelize.define(
    "bc",
    {
      SERIES: {
        type: DataTypes.STRING(20),   // FIX: TEXT → STRING with length
        allowNull: false,
        primaryKey: true,
      },
      SYMBOL: {
        type: DataTypes.STRING(50),   // FIX: TEXT → STRING
        allowNull: true,
      },
      SECURITY: {
        type: DataTypes.STRING(255),  // FIX: TEXT → STRING
        allowNull: true,
      },
      RECORD_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      BC_STRT_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      BC_END_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      EX_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      ND_STRT_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      ND_END_DT: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      PURPOSE: {
        type: DataTypes.STRING(500),  // TEXT → STRING(500)
        allowNull: true,
      },
      source_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),   // TEXT → STRING
        allowNull: true,
      },
    },
    {
      tableName: "bc",
      timestamps: false,
      freezeTableName: true,
    }
  );
}
