export default (sequelize, DataTypes) => {
  const FailedSymbols = sequelize.define(
    "FailedSymbols",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      symbol: DataTypes.STRING(20),
      reason: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") }
    },
    {
      tableName: "failed_symbols",
      timestamps: false
    }
  );

  return FailedSymbols;
};
