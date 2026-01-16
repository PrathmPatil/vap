// models/shareholdingPattern.js
export default function ShareholdingPatternModel(sequelize, DataTypes) {
  return sequelize.define(
    "shareholding_pattern_shareholding_pattern",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // FIX: TEXT → STRING(50)
      symbol: { type: DataTypes.STRING(50), allowNull: true },

      col_unknown: { type: DataTypes.TEXT, allowNull: true },

      // All quarter/year fields remain TEXT
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
      Mar_2008: { type: DataTypes.TEXT },

      Jun_2025: { type: DataTypes.TEXT },
      Jun_2024: { type: DataTypes.TEXT },
      Jun_2022: { type: DataTypes.TEXT },
      Jun_2020: { type: DataTypes.TEXT },
      Jun_2019: { type: DataTypes.TEXT },
      Jun_2018: { type: DataTypes.TEXT },

      Jul_2025: { type: DataTypes.TEXT },

      Aug_2025: { type: DataTypes.TEXT },
      Aug_2019: { type: DataTypes.TEXT },

      Sep_2025: { type: DataTypes.TEXT },
      Sep_2024: { type: DataTypes.TEXT },
      Sep_2020: { type: DataTypes.TEXT },
      Sep_2019: { type: DataTypes.TEXT },

      Dec_2023: { type: DataTypes.TEXT },
      Dec_2022: { type: DataTypes.TEXT },
      Dec_2019: { type: DataTypes.TEXT },
      Dec_2016: { type: DataTypes.TEXT },
      Dec_2015: { type: DataTypes.TEXT },
      Dec_2012: { type: DataTypes.TEXT },

      Jan_2018: { type: DataTypes.TEXT },
      Jan_2016: { type: DataTypes.TEXT },

      Feb_2016: { type: DataTypes.TEXT },

      Apr_2001: { type: DataTypes.TEXT },
    },
    {
      tableName: "shareholding_pattern_shareholding_pattern",
      timestamps: false,
      freezeTableName: true,
    }
  );
}
