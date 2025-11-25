export default (sequelize, DataTypes) => {
  const CompaniesData = sequelize.define(
    "CompaniesData",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      symbol: { type: DataTypes.STRING(50) },
      date: DataTypes.DATEONLY,
      open: DataTypes.FLOAT,
      high: DataTypes.FLOAT,
      low: DataTypes.FLOAT,
      close: DataTypes.FLOAT,
      adj_close: DataTypes.FLOAT,
      volume: DataTypes.BIGINT
    },
    {
      tableName: "companies_data",
      timestamps: false
    }
  );

  return CompaniesData;
};
