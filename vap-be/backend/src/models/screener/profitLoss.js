
// models/profitLoss.js
export default function ProfitLossModel(sequelize, DataTypes) {
  return sequelize.define(
    'profit_loss_profit_loss',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      symbol: { type: DataTypes.TEXT, allowNull: true, primaryKey: true },
      col1: { type: DataTypes.TEXT, allowNull: true },
      col2: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'profit_loss_profit_loss',
      timestamps: false,
      freezeTableName: true,
    }
  );
}
