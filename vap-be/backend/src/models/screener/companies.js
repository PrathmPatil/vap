// models/companies.js
export default function CompaniesModel(sequelize, DataTypes) {
  return sequelize.define(
    'companies',
    {
      id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      symbol: { type: DataTypes.STRING(20), allowNull: false },
      parameter: { type: DataTypes.STRING(100), allowNull: false },
      value: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'companies',
      timestamps: false,
      freezeTableName: true,
    }
  );
}
