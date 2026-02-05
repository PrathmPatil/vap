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
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
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
      timestamps: false,

      // ✅ Correct composite unique constraint
      indexes: [
        {
          unique: true,
          fields: ["symbol", "date"]
        }
      ]
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
