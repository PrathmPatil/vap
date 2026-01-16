// models/companyFinancials.js
export default function CompanyFinancialsModel(sequelize, DataTypes) {
  return sequelize.define(
    'company_financials',
    {
      id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      symbol: { type: DataTypes.STRING(20), allowNull: false },
      metric: { type: DataTypes.STRING(50), allowNull: false },
      year: { type: DataTypes.STRING(10), allowNull: false },
      value: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      tableName: 'company_financials',
      timestamps: false,
      freezeTableName: true,
    }
  );
}
