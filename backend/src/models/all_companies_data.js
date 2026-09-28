export default (sequelize, DataTypes) => {
  const AllCompaniesData = sequelize.define(
    "AllCompaniesData",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      symbol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },
      company_name: DataTypes.STRING(255),
      sector: DataTypes.STRING(100),
      industry: DataTypes.STRING(100),
      market_cap: DataTypes.BIGINT,
      pe_ratio: DataTypes.DOUBLE,
      eps: DataTypes.DOUBLE,
      dividend_yield: DataTypes.DOUBLE,
      website: DataTypes.STRING(255),
      nifty_50: DataTypes.BOOLEAN,
      nifty_500: DataTypes.BOOLEAN,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE
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
