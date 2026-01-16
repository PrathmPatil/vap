export default (sequelize, DataTypes) => {
  const AllCompaniesData = sequelize.define(
    "AllCompaniesData",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      symbol: { type: DataTypes.STRING(20) },
      date: DataTypes.DATEONLY,
      open: DataTypes.FLOAT,
      high: DataTypes.FLOAT,
      low: DataTypes.FLOAT,
      close: DataTypes.FLOAT,
      volume: DataTypes.BIGINT,
      dividends: DataTypes.FLOAT,
      stock_splits: DataTypes.FLOAT
    },
    {
      tableName: "all_companies_data",
      timestamps: false
    }
  );

  AllCompaniesData.associate = (models) => {
    AllCompaniesData.belongsTo(models.ListedCompany, {
      foreignKey: "symbol",
      targetKey: "symbol"
    });
  };

  return AllCompaniesData;
};
