export default (sequelize, DataTypes) => {
  const MainboardData = sequelize.define(
    "mainboard_data",
    {
      Company_Name: { type: DataTypes.TEXT },
      Close_Date: { type: DataTypes.TEXT },
      QIB_x_: { type: DataTypes.TEXT },
      NII_x_: { type: DataTypes.TEXT },
      Retail_x_: { type: DataTypes.TEXT },
      Employee_x_: { type: DataTypes.TEXT },
      Others_x_: { type: DataTypes.TEXT },
      Applications: { type: DataTypes.TEXT },
      Total_x_: { type: DataTypes.TEXT },
      _Highlight_Row: { type: DataTypes.TEXT },
      _Issue_Open_Date: { type: DataTypes.TEXT },
      _Issue_Close_Date: { type: DataTypes.TEXT },
      _id: { type: DataTypes.TEXT },
      _URLRewrite_Folder_Name: { type: DataTypes.TEXT },
      Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: { type: DataTypes.TEXT },
      bNII_x_: { type: DataTypes.TEXT },
      sNII_x_: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    { 
      tableName: "mainboard_data", 
      timestamps: false,      // disable Sequelize timestamps
      freezeTableName: true,  // prevent pluralizing table names
      createdAt: false,
      updatedAt: false,
      primaryKey: false       // explicitly tell Sequelize no primary key
    }
  );

  const SmeData = sequelize.define(
    "sme_data",
    {
      Company_Name: { type: DataTypes.TEXT },
      Close_Date: { type: DataTypes.TEXT },
      Open_Date: { type: DataTypes.TEXT },
      QIB_x_: { type: DataTypes.TEXT },
      NII_x_: { type: DataTypes.TEXT },
      Retail_x_: { type: DataTypes.TEXT },
      Applications: { type: DataTypes.TEXT },
      Total_x_: { type: DataTypes.TEXT },
      _Highlight_Row: { type: DataTypes.TEXT },
      _Issue_Open_Date: { type: DataTypes.TEXT },
      _Issue_Close_Date: { type: DataTypes.TEXT },
      _id: { type: DataTypes.TEXT },
      _URLRewrite_Folder_Name: { type: DataTypes.TEXT },
      Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
      tableName: "sme_data",
      timestamps: false,
      freezeTableName: true,
      createdAt: false,
      updatedAt: false,
      primaryKey: false
    }
  );

  return { MainboardData, SmeData };
};
