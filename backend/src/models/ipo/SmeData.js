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
      QIB_x_: DataTypes.STRING,
      NII_x_: DataTypes.STRING,
      Retail_x_: DataTypes.STRING,
      Employee_x_: DataTypes.STRING,
      Shareholder_x_: DataTypes.STRING,
      Others_x_: DataTypes.STRING,
      Total_x_: DataTypes.STRING,
      Applications: DataTypes.STRING,
      _Issue_Open_Date: DataTypes.STRING,
      _Issue_Close_Date: DataTypes.STRING,
      _Highlight_Row: DataTypes.STRING,
      _URLRewrite_Folder_Name: DataTypes.STRING,
      _id: DataTypes.STRING,
      Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: DataTypes.STRING,
      bNII_x_: DataTypes.STRING,
      sNII_x_: DataTypes.STRING,
      issue_status: DataTypes.STRING,
      price_band: DataTypes.STRING,
      issue_size_shares: DataTypes.STRING,
      lot_size: DataTypes.STRING,
      listing_date: DataTypes.STRING,
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
