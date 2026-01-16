export default (sequelize, DataTypes) => {
  const ListedCompany = sequelize.define(
    "ListedCompany",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      symbol: { type: DataTypes.STRING(50), unique: true },
      company_name: DataTypes.STRING(255),
      series: DataTypes.STRING(20),
      date_of_listing: DataTypes.DATEONLY,
      paid_up_value: DataTypes.INTEGER,
      market_lot: DataTypes.INTEGER,
      isin: DataTypes.STRING(50),
      face_value: DataTypes.INTEGER,
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") }
    },
    {
      tableName: "listed_companies",
      timestamps: false
    }
  );

  ListedCompany.associate = (models) => {
    ListedCompany.hasMany(models.AllCompaniesData, {
      foreignKey: "symbol",
      sourceKey: "symbol"
    });
  };

  return ListedCompany;
};
