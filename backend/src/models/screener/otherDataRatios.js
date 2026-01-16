// models/otherDataRatios.js
export default function OtherDataRatiosModel(sequelize, DataTypes) {
  return sequelize.define(
    "OtherDataRatios",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      symbol: { type: DataTypes.TEXT, allowNull: true },
      col_unknown: { type: DataTypes.TEXT, allowNull: true },

      // All Mar_* columns
      Mar_2025: { type: DataTypes.TEXT },
      Mar_2024: { type: DataTypes.TEXT },
      Mar_2023: { type: DataTypes.TEXT },
      Mar_2022: { type: DataTypes.TEXT },
      Mar_2021: { type: DataTypes.TEXT },
      Mar_2020: { type: DataTypes.TEXT },
      Mar_2019: { type: DataTypes.TEXT },
      Mar_2018: { type: DataTypes.TEXT },
      Mar_2017: { type: DataTypes.TEXT },
      Mar_2016: { type: DataTypes.TEXT },
      Mar_2015: { type: DataTypes.TEXT },
      Mar_2014: { type: DataTypes.TEXT },
      Mar_2013: { type: DataTypes.TEXT },
      Mar_2012: { type: DataTypes.TEXT },
      Mar_2011: { type: DataTypes.TEXT },
      Mar_2010: { type: DataTypes.TEXT },
      Mar_2009: { type: DataTypes.TEXT },
      Mar_2008: { type: DataTypes.TEXT },
      Mar_2007: { type: DataTypes.TEXT },
      Mar_2006: { type: DataTypes.TEXT },
      Mar_2004: { type: DataTypes.TEXT },
      Mar_2003: { type: DataTypes.TEXT },
      Mar_2002: { type: DataTypes.TEXT },

      // All Dec_* columns
      Dec_2024: { type: DataTypes.TEXT },
      Dec_2023: { type: DataTypes.TEXT },
      Dec_2022: { type: DataTypes.TEXT },
      Dec_2021: { type: DataTypes.TEXT },
      Dec_2020: { type: DataTypes.TEXT },
      Dec_2019: { type: DataTypes.TEXT },
      Dec_2018: { type: DataTypes.TEXT },
      Dec_2017: { type: DataTypes.TEXT },
      Dec_2016: { type: DataTypes.TEXT },
      Dec_2015: { type: DataTypes.TEXT },
      Dec_2014: { type: DataTypes.TEXT },
      Dec_2013: { type: DataTypes.TEXT },
      Dec_2012: { type: DataTypes.TEXT },
      Dec_2011: { type: DataTypes.TEXT },
      Dec_2010: { type: DataTypes.TEXT },
      Dec_2009: { type: DataTypes.TEXT },
      Dec_2008: { type: DataTypes.TEXT },
      Dec_2007: { type: DataTypes.TEXT },
      Dec_2006: { type: DataTypes.TEXT },
      Dec_2005: { type: DataTypes.TEXT },

      // All Jun_* columns
      Jun_2025: { type: DataTypes.TEXT },
      Jun_2024: { type: DataTypes.TEXT },
      Jun_2023: { type: DataTypes.TEXT },
      Jun_2022: { type: DataTypes.TEXT },
      Jun_2021: { type: DataTypes.TEXT },
      Jun_2020: { type: DataTypes.TEXT },
      Jun_2019: { type: DataTypes.TEXT },
      Jun_2018: { type: DataTypes.TEXT },
      Jun_2017: { type: DataTypes.TEXT },
      Jun_2016: { type: DataTypes.TEXT },
      Jun_2015: { type: DataTypes.TEXT },
      Jun_2014: { type: DataTypes.TEXT },
      Jun_2011: { type: DataTypes.TEXT },
      Jun_2010: { type: DataTypes.TEXT },

      // All Sep_* columns
      Sep_2015: { type: DataTypes.TEXT },
      Sep_2014: { type: DataTypes.TEXT },
      Sep_2013: { type: DataTypes.TEXT },
      Sep_2012: { type: DataTypes.TEXT },
    },
    {
      tableName: "other_data_ratios",
      timestamps: false,
      freezeTableName: true,
    }
  );
}
