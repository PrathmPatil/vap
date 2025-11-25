// models/bc.js
export default function BCModel(sequelize, DataTypes) {
  return sequelize.define(
    'bc',
    {
      SERIES: {
        type: DataTypes.TEXT,
        allowNull: true,
        primaryKey: true, // 👈 fake PK to stop Sequelize adding `id`
      },
      SYMBOL: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      SECURITY: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      RECORD_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      BC_STRT_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      BC_END_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      EX_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ND_STRT_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ND_END_DT: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      PURPOSE: {
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
    },
    {
      tableName: 'bc',
      timestamps: false,
      freezeTableName: true,
    }
  );
}
