const SmeDataModel = (sequelize, DataTypes) => {
  return sequelize.define(
    "SmeData",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      Company_Name: DataTypes.TEXT,
      Close_Date: DataTypes.TEXT,
      Open_Date: DataTypes.TEXT,
      QIB_x_: DataTypes.TEXT,
      NII_x_: DataTypes.TEXT,
      Retail_x_: DataTypes.TEXT,
      Applications: DataTypes.TEXT,
      Total_x_: DataTypes.TEXT,
      _Highlight_Row: DataTypes.TEXT,
      _Issue_Open_Date: DataTypes.TEXT,
      _Issue_Close_Date: DataTypes.TEXT,
      _id: DataTypes.TEXT,
      _URLRewrite_Folder_Name: DataTypes.TEXT,
      Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: DataTypes.TEXT,
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "sme_data",
      timestamps: false,
      freezeTableName: true
    }
  );
};

export default SmeDataModel;
