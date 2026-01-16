// models/cashFlow.js
export default function CashFlowModel(sequelize, DataTypes) {
  return sequelize.define(
    "cash_flow_cash_flow",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // FIX: TEXT → STRING(50) to allow indexing
      symbol: { 
        type: DataTypes.STRING(50), 
        allowNull: false,
        primaryKey: true 
      },

      col_unknown: { type: DataTypes.STRING(255), allowNull: true },

      Mar_2025: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2019: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2021: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2017: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2018: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2015: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2023: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2020: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2016: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2022: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2024: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2014: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2011: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2011: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2012: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2021: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2020: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2019: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2016: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2014: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2017: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2018: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2013: { type: DataTypes.STRING(255), allowNull: true },
      Dec_2015: { type: DataTypes.STRING(255), allowNull: true },

      Jun_2016: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2018: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2019: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2022: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2024: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2025: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2015: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2017: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2021: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2023: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2014: { type: DataTypes.STRING(255), allowNull: true },
      Jun_2020: { type: DataTypes.STRING(255), allowNull: true },

      Mar_2013: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2006: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2009: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2010: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2007: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2008: { type: DataTypes.STRING(255), allowNull: true },
      Mar_2012: { type: DataTypes.STRING(255), allowNull: true },

      Sep_2013: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "cash_flow_cash_flow",
      timestamps: false,
      freezeTableName: true,
    }
  );
}
